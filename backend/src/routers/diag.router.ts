/**
 * Diagnostics Router
 * Routes for system health and status checks
 * Task DIAG-ENDTOEND
 */

import { Router } from 'express';
import { getStatusHandler, getReadyHandler, getGeoHealthHandler } from '../controllers/diag.controller';

const router = Router();

/**
 * GET /api/v1/diag/status
 * Comprehensive system status (DB counts, GeoJSON availability)
 */
router.get('/status', getStatusHandler);

/**
 * GET /api/v1/diag/ready
 * Task K: Health check endpoint for production readiness
 */
router.get('/ready', getReadyHandler);

/**
 * GET /api/v1/diag/geo-health
 * Part C: GeoJSON health with population status
 */
router.get('/geo-health', getGeoHealthHandler);

export default router;

