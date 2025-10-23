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

