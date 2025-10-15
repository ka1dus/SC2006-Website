import { Request, Response } from 'express';
import { 
  subzoneQuerySchema, 
  subzoneIdSchema, 
  scoreQuerySchema 
} from '../schemas';
import { 
  getAllSubzones, 
  getSubzoneById, 
  getSubzoneDetails, 
  searchSubzones,
  getAllRegions 
} from '../services/subzone.service';
import { getLatestScores, getScoresByPercentile } from '../services/score.service';

// Get all subzones with optional filtering
export async function getAllSubzonesHandler(req: Request, res: Response) {
  try {
    const validatedQuery = subzoneQuerySchema.parse(req.query);
    
    const subzones = await getAllSubzones({
      region: validatedQuery.region,
      percentile: validatedQuery.percentile ? parseFloat(validatedQuery.percentile) : undefined,
      search: validatedQuery.search
    });

    res.json({
      success: true,
      data: { subzones }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subzones'
    });
  }
}

// Get subzone by ID
export async function getSubzoneByIdHandler(req: Request, res: Response) {
  try {
    const validatedParams = subzoneIdSchema.parse(req.params);
    
    const subzone = await getSubzoneById(validatedParams.id);

    if (!subzone) {
      return res.status(404).json({
        success: false,
        error: 'Subzone not found'
      });
    }

    res.json({
      success: true,
      data: { subzone }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subzone'
    });
  }
}

// Get detailed subzone information
export async function getSubzoneDetailsHandler(req: Request, res: Response) {
  try {
    const validatedParams = subzoneIdSchema.parse(req.params);
    
    const details = await getSubzoneDetails(validatedParams.id);

    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Subzone not found'
      });
    }

    res.json({
      success: true,
      data: { details }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subzone details'
    });
  }
}

// Search subzones by name
export async function searchSubzonesHandler(req: Request, res: Response) {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const subzones = await searchSubzones(query);

    res.json({
      success: true,
      data: { subzones }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search subzones'
    });
  }
}

// Get all regions
export async function getAllRegionsHandler(req: Request, res: Response) {
  try {
    const regions = await getAllRegions();

    res.json({
      success: true,
      data: { regions }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch regions'
    });
  }
}

// Get latest scores
export async function getLatestScoresHandler(req: Request, res: Response) {
  try {
    const validatedQuery = scoreQuerySchema.parse(req.query);
    
    const scores = await getLatestScores(validatedQuery.subzoneIds);

    res.json({
      success: true,
      data: { scores }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scores'
    });
  }
}

// Get scores by percentile
export async function getScoresByPercentileHandler(req: Request, res: Response) {
  try {
    const { threshold } = req.query;
    
    if (!threshold || typeof threshold !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Percentile threshold is required'
      });
    }

    const percentile = parseFloat(threshold);
    if (isNaN(percentile) || percentile < 0 || percentile > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid percentile threshold'
      });
    }

    const scores = await getScoresByPercentile(percentile);

    res.json({
      success: true,
      data: { scores }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scores by percentile'
    });
  }
}
