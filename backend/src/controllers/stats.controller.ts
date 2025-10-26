/**
 * Stats Controller
 * HTTP handlers for statistics endpoints
 * PART E: Heatmap API
 */

import { Request, Response } from 'express';
import prisma from '../db';

// In-memory cache for quantiles (5 minutes TTL)
let quantileCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/v1/stats/population-quantiles?k=5
 * Returns quantile thresholds for choropleth rendering
 */
export async function getPopulationQuantilesHandler(req: Request, res: Response) {
  try {
    const k = parseInt(req.query.k as string, 10) || 5;
    
    if (k < 2 || k > 10) {
      res.status(400).json({ 
        error: 'Invalid quantile count',
        message: 'k must be between 2 and 10',
      });
      return;
    }

    // Check cache
    if (quantileCache && Date.now() - quantileCache.timestamp < CACHE_TTL_MS) {
      const cached = quantileCache.data;
      if (cached.k === k) {
        // Add cache hit indicator
        res.set('X-Cache', 'HIT');
        res.json(cached);
        return;
      }
    }

    // Compute quantiles
    const populations = await prisma.population.findMany({
      select: { total: true },
      orderBy: { total: 'asc' },
    });

    if (populations.length === 0) {
      res.json({
        k,
        n: 0,
        min: 0,
        max: 0,
        breaks: [],
      });
      return;
    }

    const totals = populations.map(p => p.total);
    const n = totals.length;

    // Calculate breaks (k buckets -> k-1 thresholds)
    const breaks: number[] = [];
    for (let i = 1; i < k; i++) {
      const quantile = i / k; // 1/k, 2/k, ..., (k-1)/k
      const index = Math.ceil(quantile * n) - 1;
      breaks.push(totals[Math.min(index, n - 1)]);
    }

    const result = {
      k,
      n,
      min: totals[0],
      max: totals[n - 1],
      breaks,
    };

    // Update cache
    quantileCache = {
      data: result,
      timestamp: Date.now(),
    };

    res.set('X-Cache', 'MISS');
    res.json(result);
    return;
  } catch (error) {
    console.error('Error computing population quantiles:', error);
    res.status(500).json({ 
      error: 'Failed to compute quantiles',
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
}

/**
 * GET /api/v1/stats/heatmap
 * Diagnostic endpoint returning population stats and quantiles
 */
export async function getHeatmapDiagHandler(req: Request, res: Response) {
  try {
    const k = parseInt(req.query.k as string, 10) || 5;
    
    // Get population count and year
    const latestYear = await prisma.population.findFirst({
      orderBy: { year: 'desc' },
      select: { year: true },
    });

    const populationCount = await prisma.population.count();

    // Get quantiles
    const populations = await prisma.population.findMany({
      select: { total: true },
      orderBy: { total: 'asc' },
    });

    const totals = populations.map(p => p.total);
    const breaks: number[] = [];
    const n = totals.length;

    for (let i = 1; i < k; i++) {
      const quantile = i / k;
      const index = Math.ceil(quantile * n) - 1;
      breaks.push(totals[Math.min(index, n - 1)]);
    }

    res.json({
      population: {
        n: populationCount,
        year: latestYear?.year || null,
      },
      quantiles: {
        k,
        breaks,
      },
    });
    return;
  } catch (error) {
    console.error('Error fetching heatmap diagnostics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch heatmap diagnostics',
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
}

