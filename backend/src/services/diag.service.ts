/**
 * Diagnostics Service
 * Provides system health and data status checks
 * Task DIAG-ENDTOEND + PART B enhancements
 */

import prisma from '../db';
import { loadBaseGeoJSON, enrichWithPopulation } from './geo/geojson.service';
import type { GeoJSONFeatureCollection } from '../schemas/subzones.schemas';

export interface DiagStatus {
  tables: {
    subzones: number;
    population: number;
  };
  snapshots: {
    uraSubzones?: {
      finishedAt: Date | null;
      status: string;
    };
    population?: {
      finishedAt: Date | null;
      status: string;
    };
  };
  sample: {
    subzone?: {
      id: string;
      name: string;
      region: string;
    };
    population?: {
      subzoneId: string;
      year: number;
      total: number;
    };
  };
  // Legacy fields (kept for backward compatibility)
  subzones: number;
  populations: number;
  unmatched: number;
  hawkerCentres: number;
  mrtStations: number;
  busStops: number;
  geo: {
    ok: boolean;
    features: number;
    sampleIds: string[];
    error?: string;
  };
}

/**
 * Get comprehensive system status
 * Enhanced for PART B with detailed snapshot and sample data
 */
export async function getSystemStatus(): Promise<DiagStatus> {
  // Count database records
  const [
    subzoneCount,
    populationCount,
    unmatchedCount,
    hawkerCount,
    mrtCount,
    busCount,
  ] = await Promise.all([
    prisma.subzone.count(),
    prisma.population.count(),
    prisma.populationUnmatched.count(),
    prisma.hawkerCentre.count(),
    prisma.mRTStation.count(),
    prisma.busStop.count(),
  ]);

  // Get latest snapshots for key datasets
  const uraSnapshot = await prisma.datasetSnapshot.findFirst({
    where: { kind: 'ura-subzones' },
    orderBy: { finishedAt: 'desc' },
    select: { finishedAt: true, status: true },
  });

  const populationSnapshot = await prisma.datasetSnapshot.findFirst({
    where: { kind: 'census-2020-population' },
    orderBy: { finishedAt: 'desc' },
    select: { finishedAt: true, status: true },
  });

  const hawkerSnapshot = await prisma.datasetSnapshot.findFirst({
    where: { kind: 'nea-hawker-centres' },
    orderBy: { finishedAt: 'desc' },
    select: { finishedAt: true, status: true },
  });

  // Get sample records
  const sampleSubzone = await prisma.subzone.findFirst({
    select: { id: true, name: true, region: true },
  });

  const samplePopulation = await prisma.population.findFirst({
    select: { subzoneId: true, year: true, total: true },
  });

  const sampleHawker = await prisma.hawkerCentre.findFirst({
    select: { id: true, name: true, subzoneId: true },
  });

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
    // PART B structured format
    tables: {
      subzones: subzoneCount,
      population: populationCount,
    },
    snapshots: {
      ...(uraSnapshot && {
        uraSubzones: {
          finishedAt: uraSnapshot.finishedAt,
          status: uraSnapshot.status,
        },
      }),
      ...(populationSnapshot && {
        population: {
          finishedAt: populationSnapshot.finishedAt,
          status: populationSnapshot.status,
        },
      }),
      ...(hawkerSnapshot && {
        hawker: {
          finishedAt: hawkerSnapshot.finishedAt,
          status: hawkerSnapshot.status,
        },
      }),
    },
    sample: {
      ...(sampleSubzone && {
        subzone: {
          id: sampleSubzone.id,
          name: sampleSubzone.name,
          region: sampleSubzone.region,
        },
      }),
      ...(samplePopulation && {
        population: {
          subzoneId: samplePopulation.subzoneId,
          year: samplePopulation.year,
          total: samplePopulation.total,
        },
      }),
      ...(sampleHawker && {
        hawker: {
          id: sampleHawker.id,
          name: sampleHawker.name,
          subzoneId: sampleHawker.subzoneId,
        },
      }),
    },
    // Legacy fields (backward compatibility)
    subzones: subzoneCount,
    populations: populationCount,
    unmatched: unmatchedCount,
    hawkerCentres: hawkerCount,
    mrtStations: mrtCount,
    busStops: busCount,
    geo: geoStatus,
  };
}

