import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById } from '../services/auth.service';

// Demo authentication middleware (bypasses all auth for testing)
export async function demoAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Create a demo user for all requests
  (req as any).user = {
    id: 'demo-user-id',
    email: 'demo@hawker-score.sg',
    name: 'Demo User',
    role: 'CLIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  next();
}

// Authentication middleware
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get full user details
    const fullUser = await getUserById(user.id);
    if (!fullUser) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request
    (req as any).user = fullUser;
    next();
    return;

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
    return;
  }
}

// Admin authorization middleware
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }

    next();
    return;

  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
    return;
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = verifyToken(token);
      
      if (user) {
        const fullUser = await getUserById(user.id);
        if (fullUser) {
          (req as any).user = fullUser;
        }
      }
    }

    next();

  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}
