/**
 * GeoJSON Service Layer
 * Handles loading and enriching GeoJSON data for map rendering
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../../db';
import { Region } from '@prisma/client';
import {
  GeoJSONFeatureCollection,
  FeatureProperties,
} from '../../schemas/subzones.schemas';
import { getAllPopulationsMap } from '../subzones.service';
import simplify from '@turf/simplify';

const FALLBACK_GEOJSON_PATH = path.join(
  __dirname,
  '../../../public/data/subzones.geojson'
);

// Task K: In-memory cache for enriched GeoJSON
interface CacheEntry {
  data: GeoJSONFeatureCollection;
  etag: string;
  timestamp: number;
}

let enrichedCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * Load base GeoJSON from database or fallback file
 */
export async function loadBaseGeoJSON(): Promise<GeoJSONFeatureCollection | null> {
  try {
    // Strategy 1: Try loading from database
    const subzones = await prisma.subzone.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        geomGeoJSON: true,
      },
    });

    // Filter out subzones without geomGeoJSON
    const subzonesWithGeom = subzones.filter(s => s.geomGeoJSON !== null);

    if (subzonesWithGeom.length > 0) {
      // Stitch into FeatureCollection
      const features = subzonesWithGeom.map(subzone => ({
        type: 'Feature' as const,
        id: subzone.id,
        properties: {
          id: subzone.id,
          name: subzone.name,
          region: subzone.region as Region,
          // Will be enriched later
          populationTotal: null as number | null,
          populationYear: null as number | null,
          hawkerCount: 0,
          mrtExitCount: 0,
          busStopCount: 0,
        },
        geometry: subzone.geomGeoJSON as any,
      }));

      return {
        type: 'FeatureCollection',
        features,
      };
    }

    // Strategy 2: Load from fallback file
    console.log('⚠️  No GeoJSON in database, loading fallback file...');
    const fileContent = await fs.readFile(FALLBACK_GEOJSON_PATH, 'utf-8');
    const geojson = JSON.parse(fileContent);

    if (geojson.type !== 'FeatureCollection') {
      throw new Error('Fallback GeoJSON is not a FeatureCollection');
    }

    // Add default transit count fields to fallback GeoJSON features
    geojson.features = geojson.features.map((f: any) => ({
      ...f,
      properties: {
        ...f.properties,
        hawkerCount: f.properties.hawkerCount ?? 0,
        mrtExitCount: f.properties.mrtExitCount ?? 0,
        busStopCount: f.properties.busStopCount ?? 0,
      },
    }));

    return geojson;
  } catch (error) {
    console.error('❌ Failed to load base GeoJSON:', error);
    return null;
  }
}

/**
 * Enrich GeoJSON features with population data and point feature counts from database
 * Task: DATASET-AUDIT-AND-INGEST P2/P3
 */
export async function enrichWithPopulation(
  fc: GeoJSONFeatureCollection,
  regionFilter?: Region
): Promise<GeoJSONFeatureCollection> {
  // Get all populations as a map
  const populationMap = await getAllPopulationsMap();

  // Get counts of point features per subzone
  const hawkerCounts = await prisma.hawkerCentre.groupBy({
    by: ['subzoneId'],
    _count: { id: true },
  });

  const mrtCounts = await prisma.mRTExit.groupBy({
    by: ['subzoneId'],
    _count: { id: true },
  });

  const busCounts = await prisma.busStop.groupBy({
    by: ['subzoneId'],
    _count: { id: true },
  });

  // Create count maps
  const hawkerCountMap = new Map(
    hawkerCounts.map(h => [h.subzoneId, h._count.id] as [string, number]).filter(([id]) => id !== null)
  );

  const mrtCountMap = new Map(
    mrtCounts.map(m => [m.subzoneId, m._count.id] as [string, number]).filter(([id]) => id !== null)
  );

  const busCountMap = new Map(
    busCounts.map(b => [b.subzoneId, b._count.id] as [string, number]).filter(([id]) => id !== null)
  );

  // Enrich each feature
  const enrichedFeatures = fc.features
    .filter(feature => {
      // Apply region filter if provided
      if (regionFilter && feature.properties.region !== regionFilter) {
        return false;
      }
      return true;
    })
    .map(feature => {
      const subzoneId = feature.properties.id;
      const population = populationMap.get(subzoneId);

      const missing: 'population'[] = [];
      if (!population) {
        missing.push('population');
      }

      // Ensure population is always number or null (never string or undefined)
      const popTotal = population?.total;
      const popYear = population?.year;
      
      const populationTotal = popTotal !== null && popTotal !== undefined 
        ? (typeof popTotal === 'number' ? popTotal : (Number.isFinite(Number(popTotal)) ? Number(popTotal) : null))
        : null;
        
      const populationYear = popYear !== null && popYear !== undefined
        ? (typeof popYear === 'number' ? popYear : (Number.isFinite(Number(popYear)) ? Number(popYear) : null))
        : null;

      const enrichedProperties: any = {
        id: feature.properties.id,
        name: feature.properties.name,
        region: feature.properties.region as Region,
        populationTotal, // guaranteed number or null
        populationYear,  // guaranteed number or null
        hawkerCount: hawkerCountMap.get(subzoneId) ?? 0,      // P2
        mrtExitCount: mrtCountMap.get(subzoneId) ?? 0,        // P3
        busStopCount: busCountMap.get(subzoneId) ?? 0,        // P3
        missing: missing.length > 0 ? missing : undefined,
      };

      return {
        ...feature,
        properties: enrichedProperties,
      };
    });

  return {
    type: 'FeatureCollection',
    features: enrichedFeatures,
  };
}

/**
 * Get enriched GeoJSON for map rendering
 * PART E: Supports fields filtering and topology simplification
 */
export async function getEnrichedGeoJSON(
  regionFilter?: Region,
  fieldsParam?: string,
  simplifyParam?: number
): Promise<GeoJSONFeatureCollection | null> {
  const baseGeoJSON = await loadBaseGeoJSON();

  if (!baseGeoJSON) {
    return null;
  }

  const enriched = await enrichWithPopulation(baseGeoJSON, regionFilter);
  
  // Apply field filtering
  const requestedFields = fieldsParam
    ? fieldsParam.split(',').map(f => f.trim())
    : ['populationTotal', 'populationYear']; // Default

  const allowedFields = [
    'id',
    'name',
    'region',
    'populationTotal',
    'populationYear',
    'hawkerCount',
    'mrtExitCount',
    'busStopCount',
    'missing',
  ];

  // Filter properties to requested fields
  enriched.features = enriched.features.map(feature => {
    const props: any = {};
    
    // Always include minimal required properties
    props.id = feature.properties.id;
    props.name = feature.properties.name;
    props.region = feature.properties.region;
    
    // Add requested extra fields
    requestedFields.forEach(field => {
      if (allowedFields.includes(field) && field in feature.properties) {
        props[field] = feature.properties[field];
      }
    });
    
    return {
      ...feature,
      properties: props,
    };
  });

  // Apply topology simplification if requested
  if (simplifyParam && simplifyParam > 0) {
    const tolerance = simplifyParam / 111000; // Convert meters to degrees (rough approximation)
    enriched.features = enriched.features.map(feature =>
      simplify(feature, { tolerance, highQuality: false })
    );
  }

  return enriched;
}

/**
 * Task K: Get enriched GeoJSON with caching
 */
export async function getEnrichedGeoJSONWithCache(
  regionFilter?: Region,
  fieldsParam?: string,
  simplifyParam?: number
): Promise<{ data: GeoJSONFeatureCollection | null; etag: string }> {
  // Check cache (only if no params to maintain cache simplicity)
  if (!regionFilter && !fieldsParam && !simplifyParam && enrichedCache) {
    const age = Date.now() - enrichedCache.timestamp;
    if (age < CACHE_TTL_MS) {
      return { data: enrichedCache.data, etag: enrichedCache.etag };
    }
  }

  // Fetch fresh data
  const data = await getEnrichedGeoJSON(regionFilter, fieldsParam, simplifyParam);
  const etag = data ? generateETag(data) : '';

  // Cache it (only if no params)
  if (!regionFilter && !fieldsParam && !simplifyParam && data) {
    enrichedCache = { data, etag, timestamp: Date.now() };
  }

  return { data, etag };
}

/**
 * Task K: Validate GeoJSON geometry types
 */
export function validateGeoJSONGeometry(geometry: any): boolean {
  if (!geometry || !geometry.type) return false;
  return ['Polygon', 'MultiPolygon'].includes(geometry.type);
}

