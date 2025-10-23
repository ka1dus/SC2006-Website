/**
 * Subzones Router
 * Defines routes for subzone endpoints
 */

import { Router } from 'express';
import {
  listSubzonesHandler,
  getSubzoneHandler,
  batchSubzonesHandler,
  getGeoJSONHandler,
  getUnmatchedHandler,
} from '../controllers/subzones.controller';

const router = Router();

/**
 * Subzone routes
 */

// GET /api/v1/subzones - List subzones with optional filters
router.get('/subzones', listSubzonesHandler);

// GET /api/v1/subzones:batch - Get multiple subzones for comparison
router.get('/subzones:batch', batchSubzonesHandler);

// GET /api/v1/subzones/:id - Get single subzone details
router.get('/subzones/:id', getSubzoneHandler);

/**
 * GeoJSON routes
 */

// GET /api/v1/geo/subzones - Get GeoJSON for map rendering
router.get('/geo/subzones', getGeoJSONHandler);

/**
 * Admin/Debug routes
 */

// GET /api/v1/population/unmatched - Get unmatched population entries (dev only)
router.get('/population/unmatched', getUnmatchedHandler);

export default router;

