import express, { Request, Response } from 'express';
import { requireLTIAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { sendMessage, streamMessage } from '../utils/geminiService';
import ChatHistory from '../models/ChatHistory';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply LTI authentication to all chat routes
router.use(requireLTIAuth);

/**
 * POST /api/chat/message
 * Send a message and get a response
 */
router.post(
  '/message',
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw createError('Message is required', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Received chat message from user ${req.userId}`);

    // Send message to Gemini and get response
    const response = await sendMessage(req.userId, req.contextId, message);

    res.json({
      success: true,
      message: response
    });
  })
);

/**
 * POST /api/chat/stream
 * Send a message and stream the response
 */
router.post(
  '/stream',
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw createError('Message is required', 400);
    }

    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Streaming chat message from user ${req.userId}`);

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Stream response chunks
      for await (const chunk of streamMessage(req.userId, req.contextId, message)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      logger.error('Error during streaming:', error);
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
      res.end();
    }
  })
);

/**
 * GET /api/chat/history
 * Get chat history for the current user and context
 */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Fetching chat history for user ${req.userId}`);

    const chatHistory = await ChatHistory.findOne({
      userId: new Types.ObjectId(req.userId),
      contextId: req.contextId
    });

    res.json({
      success: true,
      messages: chatHistory?.messages || []
    });
  })
);

/**
 * DELETE /api/chat/history
 * Clear chat history for the current user and context
 */
router.delete(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.userId || !req.contextId) {
      throw createError('User context not found', 401);
    }

    logger.info(`Clearing chat history for user ${req.userId}`);

    await ChatHistory.findOneAndUpdate(
      {
        userId: new Types.ObjectId(req.userId),
        contextId: req.contextId
      },
      {
        messages: []
      },
      {
        upsert: true
      }
    );

    res.json({
      success: true,
      message: 'Chat history cleared'
    });
  })
);

export default router;
