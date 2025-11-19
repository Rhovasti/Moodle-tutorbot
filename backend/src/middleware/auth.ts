import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend Express Request to include user session data
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      ltiUserId?: string;
      contextId?: string;
      platformId?: string;
    }
  }
}

/**
 * Middleware to verify LTI authentication
 * Checks if the user has a valid LTI session
 */
export function requireLTIAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check if session exists and has required user data
    if (!req.session || !req.session.userId) {
      logger.warn('Unauthorized API access attempt - no valid session');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid LTI session found. Please launch the tool from Moodle.'
      });
      return;
    }

    // Attach user info to request object for use in route handlers
    req.userId = req.session.userId;
    req.ltiUserId = req.session.ltiUserId;
    req.contextId = req.session.contextId;
    req.platformId = req.session.platformId;

    logger.debug(`Authenticated request from user: ${req.userId} in context: ${req.contextId}`);

    next();
  } catch (error) {
    logger.error('Error in auth middleware:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error verifying authentication'
    });
  }
}

/**
 * Optional middleware for development/testing without LTI
 * WARNING: Only use in development mode!
 */
export function mockAuth(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    logger.error('Attempt to use mockAuth in production!');
    return requireLTIAuth(req, res, next);
  }

  // For development, create a mock session if none exists
  if (!req.session?.userId) {
    logger.warn('Using mock authentication (DEVELOPMENT ONLY)');
    if (req.session) {
      req.session.userId = 'dev-user-123';
      req.session.ltiUserId = 'dev-lti-user-123';
      req.session.contextId = 'dev-context-123';
      req.session.platformId = 'dev-platform-123';
    }
  }

  req.userId = req.session?.userId;
  req.ltiUserId = req.session?.ltiUserId;
  req.contextId = req.session?.contextId;
  req.platformId = req.session?.platformId;

  next();
}
