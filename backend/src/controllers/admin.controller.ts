import { Request, Response } from 'express';
import { prisma } from '../database/client';
import { 
  refreshDatasetsSchema, 
  createSnapshotSchema, 
  kernelConfigSchema 
} from '../schemas';
import { calculateHawkerOpportunityScores } from '../services/score.service';
import { isAdmin } from '../services/auth.service';

// Refresh datasets and recompute scores
export async function refreshDatasets(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const validatedData = refreshDatasetsSchema.parse(req.body);
    
    console.log('🔄 Starting dataset refresh...');

    // In a real implementation, this would:
    // 1. Fetch latest data from data.gov.sg APIs
    // 2. Validate and process the data
    // 3. Update the database
    // 4. Recompute scores

    // For now, we'll simulate the process
    const datasets = validatedData.datasets || ['population', 'hawker-centres', 'mrt-stations', 'bus-stops'];
    
    // Create new kernel configuration
    const kernelConfig = await prisma.kernelConfig.create({
      data: {
        kernelType: 'Gaussian',
        lambdaD: 1000,
        lambdaS: 800,
        lambdaM: 1200,
        lambdaB: 600,
        betaMRT: 1.2,
        betaBUS: 0.8,
        notes: `Refresh triggered by ${user.email} at ${new Date().toISOString()}`
      }
    });

    // Create dataset versions
    const datasetVersions = await Promise.all(
      datasets.map(datasetName => 
        prisma.datasetVersion.create({
          data: {
            snapshotId: '', // Will be updated after snapshot creation
            datasetName,
            sourceURL: `https://data.gov.sg/api/${datasetName}`,
            lastUpdated: new Date(),
            schemaHash: `${datasetName}-v${Date.now()}`
          }
        })
      )
    );

    // Create snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        notes: `Dataset refresh - ${datasets.join(', ')}`,
        config: {
          connect: { id: kernelConfig.id }
        },
        datasets: {
          connect: datasetVersions.map(dv => ({ id: dv.id }))
        }
      }
    });

    // Update dataset versions with snapshot ID
    await Promise.all(
      datasetVersions.map(dv => 
        prisma.datasetVersion.update({
          where: { id: dv.id },
          data: { snapshotId: snapshot.id }
        })
      )
    );

    // Recompute scores
    await calculateHawkerOpportunityScores(kernelConfig.id);

    res.json({
      success: true,
      message: 'Datasets refreshed and scores recomputed successfully',
      data: {
        snapshotId: snapshot.id,
        kernelConfigId: kernelConfig.id,
        datasetsRefreshed: datasets
      }
    });

  } catch (error: any) {
    console.error('Dataset refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Dataset refresh failed'
    });
  }
}

// Get all snapshots
export async function getAllSnapshots(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        config: true,
        datasets: true,
        scores: {
          take: 1 // Just to get count
        }
      }
    });

    res.json({
      success: true,
      data: { snapshots }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch snapshots'
    });
  }
}

// Get snapshot by ID
export async function getSnapshotById(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    
    const snapshot = await prisma.snapshot.findUnique({
      where: { id },
      include: {
        config: true,
        datasets: true,
        scores: {
          include: {
            subzone: {
              select: {
                subzoneId: true,
                name: true,
                region: true
              }
            }
          }
        }
      }
    });

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot not found'
      });
    }

    res.json({
      success: true,
      data: { snapshot }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch snapshot'
    });
  }
}

// Create new snapshot
export async function createSnapshot(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const validatedData = createSnapshotSchema.parse(req.body);
    
    const snapshot = await prisma.snapshot.create({
      data: {
        notes: validatedData.notes || `Snapshot created by ${user.email}`,
        config: {
          create: {
            kernelType: 'Gaussian',
            lambdaD: 1000,
            lambdaS: 800,
            lambdaM: 1200,
            lambdaB: 600,
            betaMRT: 1.2,
            betaBUS: 0.8,
            notes: 'Default configuration'
          }
        }
      },
      include: {
        config: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Snapshot created successfully',
      data: { snapshot }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create snapshot'
    });
  }
}

// Get kernel configurations
export async function getKernelConfigs(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const configs = await prisma.kernelConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshot: true
      }
    });

    res.json({
      success: true,
      data: { configs }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch kernel configurations'
    });
  }
}

// Create new kernel configuration
export async function createKernelConfig(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const validatedData = kernelConfigSchema.parse(req.body);
    
    const config = await prisma.kernelConfig.create({
      data: {
        ...validatedData,
        notes: validatedData.notes || `Configuration created by ${user.email}`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Kernel configuration created successfully',
      data: { config }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create kernel configuration'
    });
  }
}

// Get system statistics
export async function getSystemStats(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const [
      subzoneCount,
      userCount,
      snapshotCount,
      scoreCount,
      latestSnapshot
    ] = await Promise.all([
      prisma.subzone.count(),
      prisma.user.count(),
      prisma.snapshot.count(),
      prisma.hawkerOpportunityScore.count(),
      prisma.snapshot.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          config: true,
          _count: {
            select: { scores: true }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          subzones: subzoneCount,
          users: userCount,
          snapshots: snapshotCount,
          scores: scoreCount
        },
        latestSnapshot
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch system statistics'
    });
  }
}
