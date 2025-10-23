/**
 * Diagnostics Router
 * Routes for system health and status checks
 * Task DIAG-ENDTOEND
 */

import { Router } from 'express';
import { getStatusHandler } from '../controllers/diag.controller';

const router = Router();

/**
 * GET /api/v1/diag/status
 * Comprehensive system status (DB counts, GeoJSON availability)
 */
router.get('/status', getStatusHandler);

export default router;

