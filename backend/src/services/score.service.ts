import { prisma } from '../database/client';
import { KernelConfig } from '@prisma/client';

// Kernel density estimation using Gaussian kernel
function gaussianKernel(distance: number, bandwidth: number): number {
  return Math.exp(-0.5 * Math.pow(distance / bandwidth, 2));
}

// Calculate distance between two points (in meters)
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = point1[1] * Math.PI / 180;
  const lat2 = point2[1] * Math.PI / 180;
  const deltaLat = (point2[1] - point1[1]) * Math.PI / 180;
  const deltaLon = (point2[0] - point1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate demand using kernel density estimation
async function calculateDemand(subzoneId: string, config: KernelConfig): Promise<number> {
  const subzone = await prisma.subzone.findUnique({
    where: { subzoneId },
    include: { demand: true }
  });

  if (!subzone) {
    throw new Error(`Subzone ${subzoneId} not found`);
  }

  const centroid = subzone.centroid as { coordinates: [number, number] };
  const populationPoints = await prisma.populationPoint.findMany({
    where: { subzoneId }
  });

  let totalDemand = 0;
  for (const point of populationPoints) {
    const location = point.location as { coordinates: [number, number] };
    const distance = calculateDistance(centroid.coordinates, location.coordinates);
    const kernelValue = gaussianKernel(distance, config.lambdaD);
    totalDemand += point.residentCount * kernelValue;
  }

  return totalDemand;
}

// Calculate supply using kernel density estimation with competition adjustment
async function calculateSupply(subzoneId: string, config: KernelConfig): Promise<number> {
  const subzone = await prisma.subzone.findUnique({
    where: { subzoneId },
    include: { supply: true }
  });

  if (!subzone) {
    throw new Error(`Subzone ${subzoneId} not found`);
  }

  const centroid = subzone.centroid as { coordinates: [number, number] };
  const hawkerCentres = await prisma.hawkerCentre.findMany({
    where: { status: 'active' }
  });

  let totalSupply = 0;
  for (const centre of hawkerCentres) {
    const location = centre.location as { coordinates: [number, number] };
    const distance = calculateDistance(centroid.coordinates, location.coordinates);
    const kernelValue = gaussianKernel(distance, config.lambdaS);
    
    // Competition adjustment: reduce supply based on nearby population
    const nearbyPopulation = await calculateNearbyPopulation(location.coordinates, config.lambdaS);
    const competitionFactor = Math.max(0.1, 1 - (nearbyPopulation / 10000)); // Adjust based on population density
    
    totalSupply += centre.capacity * kernelValue * competitionFactor;
  }

  return totalSupply;
}

// Calculate accessibility using MRT and bus stops
async function calculateAccessibility(subzoneId: string, config: KernelConfig): Promise<number> {
  const subzone = await prisma.subzone.findUnique({
    where: { subzoneId },
    include: { accessibility: true }
  });

  if (!subzone) {
    throw new Error(`Subzone ${subzoneId} not found`);
  }

  const centroid = subzone.centroid as { coordinates: [number, number] };
  
  // Calculate MRT accessibility
  const mrtStations = await prisma.mRTStation.findMany();
  let mrtAccessibility = 0;
  for (const station of mrtStations) {
    const location = station.location as { coordinates: [number, number] };
    const distance = calculateDistance(centroid.coordinates, location.coordinates);
    const kernelValue = gaussianKernel(distance, config.lambdaM);
    mrtAccessibility += station.lineCount * kernelValue;
  }

  // Calculate bus accessibility
  const busStops = await prisma.busStop.findMany();
  let busAccessibility = 0;
  for (const stop of busStops) {
    const location = stop.location as { coordinates: [number, number] };
    const distance = calculateDistance(centroid.coordinates, location.coordinates);
    const kernelValue = gaussianKernel(distance, config.lambdaB);
    busAccessibility += stop.freqWeight * kernelValue;
  }

  // Combine MRT and bus accessibility with weights
  return config.betaMRT * mrtAccessibility + config.betaBUS * busAccessibility;
}

// Helper function to calculate nearby population for competition adjustment
async function calculateNearbyPopulation(center: [number, number], bandwidth: number): Promise<number> {
  const populationPoints = await prisma.populationPoint.findMany();
  let nearbyPopulation = 0;

  for (const point of populationPoints) {
    const location = point.location as { coordinates: [number, number] };
    const distance = calculateDistance(center, location.coordinates);
    if (distance <= bandwidth * 2) { // Within 2 bandwidths
      const kernelValue = gaussianKernel(distance, bandwidth);
      nearbyPopulation += point.residentCount * kernelValue;
    }
  }

  return nearbyPopulation;
}

// Robust z-score normalization
function robustZScore(values: number[]): number[] {
  const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const mad = values.map(v => Math.abs(v - median)).sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const madScale = mad * 1.4826; // MAD to standard deviation conversion

  return values.map(v => (v - median) / madScale);
}

// Main score calculation function
export async function calculateHawkerOpportunityScores(configId: string): Promise<void> {
  console.log('🧮 Starting Hawker Opportunity Score calculation...');

  try {
    // Get kernel configuration
    const config = await prisma.kernelConfig.findUnique({
      where: { id: configId }
    });

    if (!config) {
      throw new Error(`Kernel configuration ${configId} not found`);
    }

    // Get all subzones
    const subzones = await prisma.subzone.findMany();
    console.log(`📊 Processing ${subzones.length} subzones...`);

    // Calculate raw scores for all subzones
    const rawScores: Array<{
      subzoneId: string;
      demand: number;
      supply: number;
      accessibility: number;
    }> = [];

    for (const subzone of subzones) {
      console.log(`🔄 Calculating scores for ${subzone.name}...`);
      
      const demand = await calculateDemand(subzone.subzoneId, config);
      const supply = await calculateSupply(subzone.subzoneId, config);
      const accessibility = await calculateAccessibility(subzone.subzoneId, config);

      rawScores.push({
        subzoneId: subzone.subzoneId,
        demand,
        supply,
        accessibility
      });
    }

    // Normalize scores using robust z-scores
    const demandValues = rawScores.map(s => s.demand);
    const supplyValues = rawScores.map(s => s.supply);
    const accessibilityValues = rawScores.map(s => s.accessibility);

    const normalizedDemand = robustZScore(demandValues);
    const normalizedSupply = robustZScore(supplyValues);
    const normalizedAccessibility = robustZScore(accessibilityValues);

    // Calculate final scores and percentiles
    const finalScores: Array<{
      subzoneId: string;
      H: number;
      zDemand: number;
      zSupply: number;
      zAccess: number;
      percentile: number;
    }> = [];

    for (let i = 0; i < rawScores.length; i++) {
      const rawScore = rawScores[i];
      const zDemand = normalizedDemand[i];
      const zSupply = normalizedSupply[i];
      const zAccess = normalizedAccessibility[i];

      // Calculate final Hawker Opportunity Score
      // H = wD * Z(Dem) - wS * Z(Sup) + wA * Z(Acc)
      const H = config.lambdaD * zDemand - config.lambdaS * zSupply + config.lambdaM * zAccess;

      finalScores.push({
        subzoneId: rawScore.subzoneId,
        H,
        zDemand,
        zSupply,
        zAccess,
        percentile: 0 // Will be calculated after all scores are computed
      });
    }

    // Calculate percentiles
    const sortedScores = finalScores.sort((a, b) => b.H - a.H);
    for (let i = 0; i < sortedScores.length; i++) {
      sortedScores[i].percentile = ((sortedScores.length - i) / sortedScores.length) * 100;
    }

    // Create new snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        notes: `Score calculation with config ${configId}`,
        config: {
          connect: { id: configId }
        }
      }
    });

    // Store scores in database
    for (const score of finalScores) {
      await prisma.hawkerOpportunityScore.create({
        data: {
          subzoneId: score.subzoneId,
          H: score.H,
          zDemand: score.zDemand,
          zSupply: score.zSupply,
          zAccess: score.zAccess,
          wD: config.lambdaD,
          wS: config.lambdaS,
          wA: config.lambdaM,
          percentile: score.percentile,
          snapshotId: snapshot.id
        }
      });
    }

    console.log('✅ Hawker Opportunity Score calculation completed successfully');
    console.log(`📈 Created snapshot ${snapshot.id} with ${finalScores.length} scores`);

  } catch (error) {
    console.error('❌ Score calculation failed:', error);
    throw error;
  }
}

// Get latest scores for subzones
export async function getLatestScores(subzoneIds?: string[]) {
  try {
    // Get the latest snapshot
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        scores: {
          where: subzoneIds ? { subzoneId: { in: subzoneIds } } : undefined,
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

    if (!latestSnapshot) {
      throw new Error('No scores available');
    }

    return latestSnapshot.scores.map(score => ({
      subzoneId: score.subzoneId,
      name: score.subzone.name,
      region: score.subzone.region,
      H: score.H,
      zDemand: score.zDemand,
      zSupply: score.zSupply,
      zAccess: score.zAccess,
      percentile: score.percentile,
      snapshotId: score.snapshotId
    }));

  } catch (error) {
    console.error('Error fetching latest scores:', error);
    throw error;
  }
}

// Get scores by percentile range
export async function getScoresByPercentile(threshold: number) {
  try {
    const scores = await getLatestScores();
    return scores.filter(score => score.percentile <= threshold);
  } catch (error) {
    console.error('Error fetching scores by percentile:', error);
    throw error;
  }
}
