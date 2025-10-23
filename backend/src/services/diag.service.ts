/**
 * Diagnostics Service
 * Provides system health and data status checks
 * Task DIAG-ENDTOEND
 */

import prisma from '../db';
import { loadBaseGeoJSON, enrichWithPopulation } from './geo/geojson.service';
import type { GeoJSONFeatureCollection } from '../schemas/subzones.schemas';

export interface DiagStatus {
  subzones: number;
  populations: number;
  unmatched: number;
  geo: {
    ok: boolean;
    features: number;
    sampleIds: string[];
    error?: string;
  };
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(): Promise<DiagStatus> {
  // Count database records
  const [subzoneCount, populationCount, unmatchedCount] = await Promise.all([
    prisma.subzone.count(),
    prisma.population.count(),
    prisma.populationUnmatched.count(),
  ]);

  // Check GeoJSON availability
  let geoStatus: DiagStatus['geo'] = {
    ok: false,
    features: 0,
    sampleIds: [],
  };

  try {
    const baseGeo = await loadBaseGeoJSON();
    
    if (!baseGeo) {
      geoStatus.error = 'Failed to load GeoJSON from DB or fallback file';
    } else {
      const enrichedGeo = await enrichWithPopulation(baseGeo);
      
      geoStatus.ok = true;
      geoStatus.features = enrichedGeo.features.length;
      geoStatus.sampleIds = enrichedGeo.features
        .slice(0, 5)
        .map(f => f.properties.id)
        .filter(Boolean);
    }
  } catch (error) {
    geoStatus.error = error instanceof Error ? error.message : String(error);
  }

  return {
    subzones: subzoneCount,
    populations: populationCount,
    unmatched: unmatchedCount,
    geo: geoStatus,
  };
}

