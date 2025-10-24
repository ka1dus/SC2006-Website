/**
 * Population Service
 * PART B: Population data access and statistics
 */

import prisma from '../db';

/**
 * Gets population quantile thresholds for choropleth rendering
 * Returns 5 quantile boundaries (20th, 40th, 60th, 80th, 100th percentiles)
 * 
 * Frontend can use these to create color buckets:
 * - 0 to q[0]: Very Low
 * - q[0] to q[1]: Low
 * - q[1] to q[2]: Medium
 * - q[2] to q[3]: High
 * - q[3] to q[4]: Very High
 */
export async function getPopulationQuantiles(): Promise<number[]> {
  // Get all population totals, sorted
  const populations = await prisma.population.findMany({
    select: { total: true },
    orderBy: { total: 'asc' },
  });

  if (populations.length === 0) {
    return [0, 0, 0, 0, 0];
  }

  const totals = populations.map(p => p.total);
  const n = totals.length;

  // Calculate quantile indices (20%, 40%, 60%, 80%, 100%)
  const quantiles = [0.2, 0.4, 0.6, 0.8, 1.0].map(q => {
    const index = Math.ceil(q * n) - 1;
    return totals[Math.min(index, n - 1)];
  });

  return quantiles;
}

/**
 * Gets population statistics summary
 */
export async function getPopulationStats() {
  const populations = await prisma.population.findMany({
    select: { total: true },
  });

  if (populations.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
    };
  }

  const totals = populations.map(p => p.total).sort((a, b) => a - b);
  const count = totals.length;
  const sum = totals.reduce((acc, val) => acc + val, 0);
  const mean = Math.round(sum / count);
  const median = count % 2 === 0
    ? Math.round((totals[count / 2 - 1] + totals[count / 2]) / 2)
    : totals[Math.floor(count / 2)];

  return {
    count,
    min: totals[0],
    max: totals[count - 1],
    mean,
    median,
  };
}

