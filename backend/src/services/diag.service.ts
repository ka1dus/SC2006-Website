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
    hawkerCentres: number;
    mrtExits: number;
    busStops: number;
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
    hawker?: {
      finishedAt: Date | null;
      status: string;
    };
    mrt?: {
      finishedAt: Date | null;
      status: string;
    };
    bus?: {
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
    hawker?: {
      id: string;
      name: string;
      subzoneId: string | null;
    };
    mrt?: {
      id: string;
      station: string | null;
      code: string | null;
      subzoneId: string | null;
    };
    bus?: {
      id: string;
      name: string | null;
      road: string | null;
      subzoneId: string | null;
    };
  };
  // Legacy fields (kept for backward compatibility)
  subzones: number;
  populations: number;
  unmatched: number;
  hawkerCentres: number;
  mrtExits: number;
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
    prisma.mRTExit.count(),
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

  const mrtSnapshot = await prisma.datasetSnapshot.findFirst({
    where: { kind: 'mrt-exits' },
    orderBy: { finishedAt: 'desc' },
    select: { finishedAt: true, status: true },
  });

  const busSnapshot = await prisma.datasetSnapshot.findFirst({
    where: { kind: 'bus-stops' },
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

  const sampleMRT = await prisma.mRTExit.findFirst({
    select: { id: true, station: true, code: true, subzoneId: true },
  });

  const sampleBus = await prisma.busStop.findFirst({
    select: { id: true, name: true, road: true, subzoneId: true },
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
      hawkerCentres: hawkerCount,
      mrtExits: mrtCount,
      busStops: busCount,
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
      ...(mrtSnapshot && {
        mrt: {
          finishedAt: mrtSnapshot.finishedAt,
          status: mrtSnapshot.status,
        },
      }),
      ...(busSnapshot && {
        bus: {
          finishedAt: busSnapshot.finishedAt,
          status: busSnapshot.status,
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
      ...(sampleMRT && {
        mrt: {
          id: sampleMRT.id,
          station: sampleMRT.station,
          code: sampleMRT.code,
          subzoneId: sampleMRT.subzoneId,
        },
      }),
      ...(sampleBus && {
        bus: {
          id: sampleBus.id,
          name: sampleBus.name,
          road: sampleBus.road,
          subzoneId: sampleBus.subzoneId,
        },
      }),
    },
    // Legacy fields (backward compatibility)
    subzones: subzoneCount,
    populations: populationCount,
    unmatched: unmatchedCount,
    hawkerCentres: hawkerCount,
    mrtExits: mrtCount,
    busStops: busCount,
    geo: geoStatus,
  };
}

