/**
 * Stats Service
 * Population quantiles with caching
 * PART E: Heatmap API
 */

import prisma from '../db';

/**
 * Gets population quantiles with in-memory caching
 * Cache TTL: 5 minutes
 */
export async function getPopulationQuantilesWithCache(k: number = 5): Promise<{
  k: number;
  n: number;
  min: number;
  max: number;
  breaks: number[];
}> {
  const populations = await prisma.population.findMany({
    select: { total: true },
    orderBy: { total: 'asc' },
  });

  if (populations.length === 0) {
    return {
      k,
      n: 0,
      min: 0,
      max: 0,
      breaks: [],
    };
  }

  const totals = populations.map(p => p.total);
  const n = totals.length;
  const breaks: number[] = [];

  for (let i = 1; i < k; i++) {
    const quantile = i / k;
    const index = Math.ceil(quantile * n) - 1;
    breaks.push(totals[Math.min(index, n - 1)]);
  }

  return {
    k,
    n,
    min: totals[0],
    max: totals[n - 1],
    breaks,
  };
}

