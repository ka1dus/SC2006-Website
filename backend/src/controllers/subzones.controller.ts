/**
 * Subzones Controller
 * HTTP handlers for subzone endpoints
 */

import { Request, Response, NextFunction } from 'express';
import {
  ListQuerySchema,
  BatchQuerySchema,
  SubzoneIdParamSchema,
  GeoQuerySchema,
} from '../schemas/subzones.schemas';
import {
  listSubzones,
  getSubzone,
  getSubzonesByIds,
  getUnmatchedPopulations,
} from '../services/subzones.service';
import { getEnrichedGeoJSON } from '../services/geo/geojson.service';

/**
 * GET /api/v1/subzones
 * List subzones with optional filters
 */
export async function listSubzonesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate query parameters
    const query = ListQuerySchema.parse(req.query);

    // Fetch subzones
    const subzones = await listSubzones(query);

    res.json(subzones);
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/subzones/:id
 * Get single subzone details
 */
export async function getSubzoneHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate path parameter
    const { id } = SubzoneIdParamSchema.parse(req.params);

    // Fetch subzone
    const subzone = await getSubzone(id);

    if (!subzone) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Subzone with id '${id}' not found`,
      });
      return;
    }

    res.json(subzone);
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/subzones:batch
 * Get multiple subzones for comparison
 */
export async function batchSubzonesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate query parameters
    const { ids } = BatchQuerySchema.parse(req.query);

    // Parse IDs
    const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);

    // Fetch subzones
    const subzones = await getSubzonesByIds(idArray);

    // Check if any IDs were not found
    const foundIds = new Set(subzones.map(s => s.id));
    const notFound = idArray.filter(id => !foundIds.has(id));

    if (notFound.length > 0) {
      // Return partial results with notFound array
      res.json({
        data: subzones,
        notFound,
      });
      return;
    }

    res.json(subzones);
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/geo/subzones
 * Get GeoJSON FeatureCollection for map rendering
 */
export async function getGeoJSONHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate query parameters
    const { region } = GeoQuerySchema.parse(req.query);

    // Load and enrich GeoJSON
    const geojson = await getEnrichedGeoJSON(region);

    if (!geojson) {
      res.status(503).json({
        error: 'GEODATA_UNAVAILABLE',
        message: 'GeoJSON data is temporarily unavailable. List and detail endpoints still work.',
      });
      return;
    }

    res.json(geojson);
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/population/unmatched
 * Get unmatched population entries (admin/debug)
 * Only available in development mode
 */
export async function getUnmatchedHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'This endpoint is only available in development mode',
      });
      return;
    }

    // Parse limit and offset
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch unmatched entries
    const result = await getUnmatchedPopulations(limit, offset);

    res.json(result);
    return;
  } catch (error) {
    next(error);
  }
}
