import express, { Request, Response } from 'express';
import { requireLTIAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import Memory from '../models/Memory';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply LTI authentication to all memory routes
router.use(requireLTIAuth);

/**
 * GET /api/memories
 * Get all memories for the current user and context
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Fetching memories for user ${req.userId}`);

    const memories = await Memory.find({
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      memories
    });
  })
);

/**
 * POST /api/memories
 * Create a new memory
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { content, category } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw createError('Memory content is required', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Creating memory for user ${req.userId}`);

    const memory = await Memory.create({
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId,
      content: content.trim(),
      category: category || 'general'
    });

    res.status(201).json({
      success: true,
      memory
    });
  })
);

/**
 * PUT /api/memories/:id
 * Update a memory
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content, category } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      throw createError('Invalid memory ID', 400);
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw createError('Memory content is required', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Updating memory ${id} for user ${req.userId}`);

    // Ensure the memory belongs to the current user and context
    const memory = await Memory.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(req.userId),
        contextId: req.contextId
      },
      {
        content: content.trim(),
        ...(category && { category })
      },
      {
        new: true
      }
    );

    if (!memory) {
      throw createError('Memory not found or unauthorized', 404);
    }

    res.json({
      success: true,
      memory
    });
  })
);

/**
 * DELETE /api/memories/:id
 * Delete a memory
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw createError('Invalid memory ID', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Deleting memory ${id} for user ${req.userId}`);

    // Ensure the memory belongs to the current user and context
    const memory = await Memory.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId
    });

    if (!memory) {
      throw createError('Memory not found or unauthorized', 404);
    }

    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  })
);

/**
 * PUT /api/memories/bulk
 * Bulk update memories (used for updating all memories at once from the UI)
 */
router.put(
  '/bulk',
  asyncHandler(async (req: Request, res: Response) => {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      throw createError('Content is required', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Bulk updating memories for user ${req.userId}`);

    // Delete all existing memories for this user/context
    await Memory.deleteMany({
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId
    });

    // Create a single memory with the bulk content
    const memory = await Memory.create({
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId,
      content: content.trim(),
      category: 'general'
    });

    res.json({
      success: true,
      memory
    });
  })
);

export default router;
