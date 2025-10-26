/**
 * Stats Router
 * Routes for population quantiles and statistics
 * PART E: Heatmap API
 */

import { Router } from 'express';
import { getPopulationQuantilesHandler, getHeatmapDiagHandler } from '../controllers/stats.controller';

const router = Router();

/**
 * GET /api/v1/stats/population-quantiles?k=5
 * Returns population quantile thresholds for choropleth rendering
 */
router.get('/population-quantiles', getPopulationQuantilesHandler);

/**
 * GET /api/v1/stats/heatmap
 * Diagnostic endpoint returning population stats and quantiles
 */
router.get('/heatmap', getHeatmapDiagHandler);

export default router;

