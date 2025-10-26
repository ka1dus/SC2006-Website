/**
 * Diagnostics Controller
 * HTTP handlers for system diagnostics
 * Task DIAG-ENDTOEND
 */

import { Request, Response, NextFunction } from 'express';
import { getSystemStatus } from '../services/diag.service';

/**
 * GET /api/v1/diag/status
 * Returns comprehensive system status
 */
export async function getStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await getSystemStatus();
    
    res.status(200).json(status);
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/diag/ready
 * Task K: Simple health check for production (DB connectivity)
 */
export async function getReadyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const prisma = require('../db').default;
    
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({ 
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
    return;
  }
}

