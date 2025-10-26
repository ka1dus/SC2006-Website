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
 * PART E: Supports fields and simplify query params
 */
export async function getGeoJSONHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate query parameters
    const { region } = GeoQuerySchema.parse(req.query);
    
    // Extract optional fields and simplify params
    const fields = req.query.fields as string | undefined;
    const simplifyValue = req.query.simplify as string | undefined;
    const simplifyMeters = simplifyValue ? parseInt(simplifyValue, 10) : undefined;

    // Load and enrich GeoJSON with fields filtering and simplification
    const geojson = await getEnrichedGeoJSON(region, fields, simplifyMeters);

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

// ============================================================================
// LEGACY HANDLER ALIASES (for backward compatibility with old routes)
// ============================================================================

/**
 * Alias for listSubzonesHandler
 * Used by legacy /api/subzones route
 */
export const getAllSubzonesHandler = listSubzonesHandler;

/**
 * Alias for getSubzoneHandler
 * Used by legacy /api/subzones/:id route
 */
export const getSubzoneByIdHandler = getSubzoneHandler;

// ============================================================================
// STUB HANDLERS (501 Not Implemented - for legacy routes)
// ============================================================================

/**
 * GET /api/subzones/:id/details (legacy)
 * Returns 501 Not Implemented - use Task 2 API instead
 */
export async function getSubzoneDetailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'This endpoint is deprecated. Use /api/v1/subzones/:id instead.',
      alternative: `/api/v1/subzones/${req.params.id}`,
    });
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subzones/search (legacy)
 * Returns 501 Not Implemented - use Task 2 API instead
 */
export async function searchSubzonesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'This endpoint is deprecated. Use /api/v1/subzones?q=... instead.',
      alternative: '/api/v1/subzones?q=' + (req.query.q || ''),
    });
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subzones/regions (legacy)
 * Returns 501 Not Implemented - hardcoded regions available client-side
 */
export async function getAllRegionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'This endpoint is deprecated. Regions are: CENTRAL, EAST, NORTH, NORTH_EAST, WEST.',
      regions: ['CENTRAL', 'EAST', 'NORTH', 'NORTH_EAST', 'WEST', 'UNKNOWN'],
    });
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/scores/latest (legacy)
 * Returns 501 Not Implemented - scores not yet calculated
 */
export async function getLatestScoresHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'Score calculation not yet implemented. Coming in future tasks.',
    });
    return;
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/scores/percentile (legacy)
 * Returns 501 Not Implemented - scores not yet calculated
 */
export async function getScoresByPercentileHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'Score calculation not yet implemented. Coming in future tasks.',
    });
    return;
  } catch (error) {
    next(error);
  }
}
