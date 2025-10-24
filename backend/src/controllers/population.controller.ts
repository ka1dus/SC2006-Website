/**
 * Population Controller
 * PART B: Population data endpoints
 */

import { Request, Response } from 'express';
import { getPopulationQuantiles, getPopulationStats } from '../services/population.service';

/**
 * GET /api/v1/population/quantiles
 * Returns 5 quantile thresholds for choropleth rendering
 */
export async function getQuantilesHandler(req: Request, res: Response) {
  try {
    const quantiles = await getPopulationQuantiles();
    
    res.json({
      quantiles,
      labels: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
      description: 'Population quantiles for choropleth coloring (20%, 40%, 60%, 80%, 100%)',
    });
    return;
  } catch (error) {
    console.error('Error fetching population quantiles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch population quantiles',
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
}

/**
 * GET /api/v1/population/stats
 * Returns population statistics summary
 */
export async function getStatsHandler(req: Request, res: Response) {
  try {
    const stats = await getPopulationStats();
    
    res.json(stats);
    return;
  } catch (error) {
    console.error('Error fetching population stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch population stats',
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
}

