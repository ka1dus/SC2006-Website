/**
 * Population Routes
 * PART B: Population data endpoints
 */

import { Router } from 'express';
import { getQuantilesHandler, getStatsHandler } from '../controllers/population.controller';

const router = Router();

/**
 * GET /api/v1/population/quantiles
 * Returns population quantiles for choropleth rendering
 */
router.get('/quantiles', getQuantilesHandler);

/**
 * GET /api/v1/population/stats
 * Returns population statistics summary
 */
router.get('/stats', getStatsHandler);

export default router;

