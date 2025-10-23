/**
 * Zod schemas for subzone API endpoints
 * Validates request parameters, queries, and responses
 */

import { z } from 'zod';
import { Region } from '@prisma/client';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Query parameters for GET /api/v1/subzones
 */
export const ListQuerySchema = z.object({
  region: z.nativeEnum(Region).optional(),
  ids: z.string().optional(), // comma-separated
  q: z.string().optional(), // search query
  limit: z.coerce.number().int().positive().max(500).default(200),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ListQuery = z.infer<typeof ListQuerySchema>;

/**
 * Query parameters for GET /api/v1/subzones:batch
 */
export const BatchQuerySchema = z.object({
  ids: z.string().min(1), // comma-separated, 2-8 ids
}).refine(
  (data) => {
    const ids = data.ids.split(',').filter(Boolean);
    return ids.length >= 2 && ids.length <= 8;
  },
  { message: 'ids must contain between 2 and 8 comma-separated values' }
);

export type BatchQuery = z.infer<typeof BatchQuerySchema>;

/**
 * Path parameters for GET /api/v1/subzones/:id
 */
export const SubzoneIdParamSchema = z.object({
  id: z.string().min(1),
});

export type SubzoneIdParam = z.infer<typeof SubzoneIdParamSchema>;

/**
 * Query parameters for GET /api/v1/geo/subzones
 */
export const GeoQuerySchema = z.object({
  region: z.nativeEnum(Region).optional(),
});

export type GeoQuery = z.infer<typeof GeoQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Population data structure
 */
export const PopulationSchema = z.object({
  total: z.number().int().nonnegative(),
  year: z.number().int(),
}).nullable();

export type PopulationData = z.infer<typeof PopulationSchema>;

/**
 * Metrics data structure (future: demand, supply, accessibility, score)
 */
export const MetricsSchema = z.object({
  demand: z.number().nullable().optional(),
  supply: z.number().nullable().optional(),
  accessibility: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
}).optional();

export type MetricsData = z.infer<typeof MetricsSchema>;

/**
 * Info structure for missing data flags
 */
export const InfoSchema = z.object({
  missing: z.array(z.enum(['population', 'metrics'])).optional(),
}).optional();

export type InfoData = z.infer<typeof InfoSchema>;

/**
 * Subzone list item for GET /api/v1/subzones
 */
export const SubzoneListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.nativeEnum(Region),
  population: PopulationSchema,
  info: InfoSchema,
});

export type SubzoneListItem = z.infer<typeof SubzoneListItemSchema>;

/**
 * Subzone detail for GET /api/v1/subzones/:id and :batch
 */
export const SubzoneDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.nativeEnum(Region),
  population: PopulationSchema,
  metrics: MetricsSchema,
  info: InfoSchema,
});

export type SubzoneDetail = z.infer<typeof SubzoneDetailSchema>;

/**
 * GeoJSON Feature properties for map rendering
 */
export const FeaturePropertiesSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.nativeEnum(Region),
  populationTotal: z.number().int().nonnegative().nullable(),
  populationYear: z.number().int().nullable(),
  missing: z.array(z.literal('population')).optional(),
});

export type FeatureProperties = z.infer<typeof FeaturePropertiesSchema>;

/**
 * Minimal GeoJSON Feature validation
 * Full geometry validation is skipped for performance
 */
export const GeoJSONFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: FeaturePropertiesSchema,
  geometry: z.any(), // Skip deep validation for performance
  id: z.union([z.string(), z.number()]).optional(),
});

export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;

/**
 * GeoJSON FeatureCollection
 */
export const GeoJSONFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONFeatureSchema),
});

export type GeoJSONFeatureCollection = z.infer<typeof GeoJSONFeatureCollectionSchema>;

// ============================================================================
// Error Response Schemas
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Unmatched Population Response (for admin/debug)
// ============================================================================

export const UnmatchedItemSchema = z.object({
  id: z.string(),
  sourceKey: z.string(),
  rawName: z.string(),
  reason: z.string().nullable(),
  details: z.any().nullable(),
  createdAt: z.date(),
});

export type UnmatchedItem = z.infer<typeof UnmatchedItemSchema>;

export const UnmatchedListSchema = z.object({
  items: z.array(UnmatchedItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type UnmatchedList = z.infer<typeof UnmatchedListSchema>;

