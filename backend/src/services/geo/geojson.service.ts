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

const FALLBACK_GEOJSON_PATH = path.join(
  __dirname,
  '../../../public/data/subzones.geojson'
);

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
    hawkerCounts.map(h => [h.subzoneId, h._count.id]).filter(([id]) => id !== null)
  );

  const mrtCountMap = new Map(
    mrtCounts.map(m => [m.subzoneId, m._count.id]).filter(([id]) => id !== null)
  );

  const busCountMap = new Map(
    busCounts.map(b => [b.subzoneId, b._count.id]).filter(([id]) => id !== null)
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

      const enrichedProperties: any = {
        id: feature.properties.id,
        name: feature.properties.name,
        region: feature.properties.region as Region,
        populationTotal: population?.total ?? null,
        populationYear: population?.year ?? null,
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
 */
export async function getEnrichedGeoJSON(
  regionFilter?: Region
): Promise<GeoJSONFeatureCollection | null> {
  const baseGeoJSON = await loadBaseGeoJSON();

  if (!baseGeoJSON) {
    return null;
  }

  return enrichWithPopulation(baseGeoJSON, regionFilter);
}

