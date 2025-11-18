import express, { Request, Response } from 'express';
import { requireLTIAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import MoodleContext from '../models/MoodleContext';
import { MoodleContextTransformer } from '../services/MoodleContextTransformer';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply LTI authentication to all routes
router.use(requireLTIAuth);

/**
 * GET /api/moodle-context
 * Get Moodle context for the current user and course
 * Automatically syncs from Moodle if stale or missing
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, contextId } = req;

    if (!userId || !contextId) {
      throw createError('User context not found', 401);
    }

    // Extract course ID from contextId (format might be "course-123" or just "123")
    const courseIdMatch = contextId.match(/\d+/);
    if (!courseIdMatch) {
      throw createError('Invalid course context', 400);
    }
    const courseId = parseInt(courseIdMatch[0], 10);

    // Get Moodle user ID from query params (will be passed from LTI launch data)
    const moodleUserId = parseInt(req.query.moodleUserId as string, 10);
    if (!moodleUserId || isNaN(moodleUserId)) {
      throw createError('Moodle user ID is required', 400);
    }

    logger.info(`Fetching Moodle context for user ${userId}, course ${courseId}`);

    // Find existing context
    let context = await MoodleContext.findOne({
      userId: new Types.ObjectId(userId),
      courseId
    });

    // If context doesn't exist or is stale, sync from Moodle
    if (!context || context.isSyncStale()) {
      logger.info(`Syncing Moodle context for user ${userId}, course ${courseId}`);

      try {
        // Fetch and transform data from Moodle
        const transformedData = await MoodleContextTransformer.fetchAndTransform(
          moodleUserId,
          courseId
        );

        if (context) {
          // Update existing context
          Object.assign(context, transformedData);
          await context.save();
        } else {
          // Create new context
          context = await MoodleContext.create({
            userId: new Types.ObjectId(userId),
            ...transformedData
          });
        }

        logger.info(`Successfully synced Moodle context for user ${userId}`);
      } catch (error: any) {
        logger.error(`Failed to sync Moodle context: ${error.message}`);

        // If we have existing data, return it even if stale
        if (context) {
          logger.info('Returning stale Moodle context due to sync error');
          return res.json({
            success: true,
            context,
            stale: true,
            error: 'Failed to sync latest data from Moodle'
          });
        }

        // No existing data and sync failed
        throw createError(`Failed to fetch Moodle context: ${error.message}`, 500);
      }
    }

    return res.json({
      success: true,
      context,
      stale: false
    });
  })
);

/**
 * POST /api/moodle-context/sync
 * Force sync Moodle context (refresh data from Moodle)
 */
router.post(
  '/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, contextId } = req;

    if (!userId || !contextId) {
      throw createError('User context not found', 401);
    }

    const courseIdMatch = contextId.match(/\d+/);
    if (!courseIdMatch) {
      throw createError('Invalid course context', 400);
    }
    const courseId = parseInt(courseIdMatch[0], 10);

    const moodleUserId = parseInt(req.body.moodleUserId as string, 10);
    if (!moodleUserId || isNaN(moodleUserId)) {
      throw createError('Moodle user ID is required', 400);
    }

    logger.info(`Force syncing Moodle context for user ${userId}, course ${courseId}`);

    // Fetch and transform data from Moodle
    const transformedData = await MoodleContextTransformer.fetchAndTransform(
      moodleUserId,
      courseId
    );

    // Update or create context
    let context = await MoodleContext.findOne({
      userId: new Types.ObjectId(userId),
      courseId
    });

    if (context) {
      Object.assign(context, transformedData);
      await context.save();
    } else {
      context = await MoodleContext.create({
        userId: new Types.ObjectId(userId),
        ...transformedData
      });
    }

    logger.info(`Successfully force synced Moodle context for user ${userId}`);

    res.json({
      success: true,
      context,
      message: 'Moodle context synced successfully'
    });
  })
);

/**
 * GET /api/moodle-context/prompt
 * Get formatted Moodle context for AI prompt
 */
router.get(
  '/prompt',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, contextId } = req;

    if (!userId || !contextId) {
      throw createError('User context not found', 401);
    }

    const courseIdMatch = contextId.match(/\d+/);
    if (!courseIdMatch) {
      throw createError('Invalid course context', 400);
    }
    const courseId = parseInt(courseIdMatch[0], 10);

    logger.info(`Fetching Moodle prompt context for user ${userId}, course ${courseId}`);

    const context = await MoodleContext.findOne({
      userId: new Types.ObjectId(userId),
      courseId
    });

    if (!context) {
      throw createError('Moodle context not found. Please sync first.', 404);
    }

    // Use the model's method to get formatted prompt context
    const promptContext = context.toPromptContext();

    res.json({
      success: true,
      promptContext,
      lastSynced: context.lastSyncedAt
    });
  })
);

/**
 * DELETE /api/moodle-context
 * Delete Moodle context for the current user and course
 */
router.delete(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, contextId } = req;

    if (!userId || !contextId) {
      throw createError('User context not found', 401);
    }

    const courseIdMatch = contextId.match(/\d+/);
    if (!courseIdMatch) {
      throw createError('Invalid course context', 400);
    }
    const courseId = parseInt(courseIdMatch[0], 10);

    logger.info(`Deleting Moodle context for user ${userId}, course ${courseId}`);

    const context = await MoodleContext.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      courseId
    });

    if (!context) {
      throw createError('Moodle context not found', 404);
    }

    res.json({
      success: true,
      message: 'Moodle context deleted successfully'
    });
  })
);

export default router;
