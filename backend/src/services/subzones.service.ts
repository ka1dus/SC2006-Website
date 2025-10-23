/**
 * Subzones Service Layer
 * Handles database access and business logic for subzone operations
 */

import { prisma } from '../db';
import { Region } from '@prisma/client';
import {
  SubzoneListItem,
  SubzoneDetail,
  ListQuery,
} from '../schemas/subzones.schemas';

/**
 * List subzones with optional filters
 */
export async function listSubzones(query: ListQuery): Promise<SubzoneListItem[]> {
  const { region, ids, q, limit, offset } = query;

  // Build where clause
  const where: any = {};

  if (region) {
    where.region = region;
  }

  if (ids) {
    const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);
    where.id = { in: idArray };
  }

  if (q) {
    where.name = { contains: q, mode: 'insensitive' };
  }

  // Query with population join
  const subzones = await prisma.subzone.findMany({
    where,
    include: {
      population: true,
    },
    orderBy: { name: 'asc' },
    take: limit,
    skip: offset,
  });

  // Map to response format
  return subzones.map(subzone => {
    const hasPopulation = !!subzone.population;
    const missing: ('population' | 'metrics')[] = [];
    
    if (!hasPopulation) {
      missing.push('population');
    }

    return {
      id: subzone.id,
      name: subzone.name,
      region: subzone.region as Region,
      population: hasPopulation
        ? {
            total: subzone.population!.total,
            year: subzone.population!.year,
          }
        : null,
      info: missing.length > 0 ? { missing } : undefined,
    };
  });
}

/**
 * Get a single subzone by ID
 */
export async function getSubzone(id: string): Promise<SubzoneDetail | null> {
  const subzone = await prisma.subzone.findUnique({
    where: { id },
    include: {
      population: true,
      // Future: include demand, supply, accessibility, scores
    },
  });

  if (!subzone) {
    return null;
  }

  const hasPopulation = !!subzone.population;
  const missing: ('population' | 'metrics')[] = [];
  
  if (!hasPopulation) {
    missing.push('population');
  }

  // Future: check for metrics
  // Always flag metrics as missing for now since we haven't implemented scores yet
  missing.push('metrics');

  return {
    id: subzone.id,
    name: subzone.name,
    region: subzone.region as Region,
    population: hasPopulation
      ? {
          total: subzone.population!.total,
          year: subzone.population!.year,
        }
      : null,
    metrics: {
      demand: null,
      supply: null,
      accessibility: null,
      score: null,
    },
    info: missing.length > 0 ? { missing } : undefined,
  };
}

/**
 * Get multiple subzones by IDs (for comparison)
 * Preserves input order and de-duplicates
 */
export async function getSubzonesByIds(ids: string[]): Promise<SubzoneDetail[]> {
  // De-duplicate while preserving order
  const uniqueIds = Array.from(new Set(ids));

  // Batch query
  const subzones = await prisma.subzone.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      population: true,
      // Future: include demand, supply, accessibility, scores
    },
  });

  // Create a map for quick lookup
  const subzoneMap = new Map(subzones.map(s => [s.id, s]));

  // Return in input order, skipping any not found
  return uniqueIds
    .map(id => subzoneMap.get(id))
    .filter((subzone): subzone is NonNullable<typeof subzone> => !!subzone)
    .map(subzone => {
      const hasPopulation = !!subzone.population;
      const missing: ('population' | 'metrics')[] = [];
      
      if (!hasPopulation) {
        missing.push('population');
      }

      // Always flag metrics as missing for now
      missing.push('metrics');

      return {
        id: subzone.id,
        name: subzone.name,
        region: subzone.region as Region,
        population: hasPopulation
          ? {
              total: subzone.population!.total,
              year: subzone.population!.year,
            }
          : null,
        metrics: {
          demand: null,
          supply: null,
          accessibility: null,
          score: null,
        },
        info: missing.length > 0 ? { missing } : undefined,
      };
    });
}

/**
 * Get all populations as a map (for GeoJSON enrichment)
 */
export async function getAllPopulationsMap(): Promise<Map<string, { total: number; year: number }>> {
  const populations = await prisma.population.findMany({
    select: {
      subzoneId: true,
      total: true,
      year: true,
    },
  });

  return new Map(
    populations.map(p => [p.subzoneId, { total: p.total, year: p.year }])
  );
}

/**
 * Get unmatched population entries (for admin/debug)
 */
export async function getUnmatchedPopulations(limit: number = 100, offset: number = 0) {
  const [items, total] = await Promise.all([
    prisma.populationUnmatched.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.populationUnmatched.count(),
  ]);

  return {
    items,
    total,
    limit,
    offset,
  };
}

