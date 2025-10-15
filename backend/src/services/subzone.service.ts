import { prisma } from '../database/client';

export interface SubzoneWithScore {
  id: string;
  subzoneId: string;
  name: string;
  region: string;
  geometryPolygon: any;
  centroid: any;
  radii: number[];
  score?: {
    H: number;
    percentile: number;
    zDemand: number;
    zSupply: number;
    zAccess: number;
  };
}

export interface SubzoneDetails {
  id: string;
  subzoneId: string;
  name: string;
  region: string;
  geometryPolygon: any;
  centroid: any;
  radii: number[];
  demographics?: {
    total: number;
    ageGroups: {
      age0_14: number;
      age15_64: number;
      age65p: number;
    };
  };
  hawkerCentres?: Array<{
    id: string;
    name: string;
    distance: number;
    capacity: number;
  }>;
  mrtStations?: Array<{
    id: string;
    name: string;
    distance: number;
    lineCount: number;
  }>;
  busStops?: Array<{
    id: string;
    code: string;
    distance: number;
    freqWeight: number;
  }>;
  score?: {
    H: number;
    percentile: number;
    zDemand: number;
    zSupply: number;
    zAccess: number;
    wD: number;
    wS: number;
    wA: number;
  };
}

// Get all subzones with optional filtering
export async function getAllSubzones(filters?: {
  region?: string;
  percentile?: number;
  search?: string;
}): Promise<SubzoneWithScore[]> {
  try {
    let whereClause: any = {};

    // Apply region filter
    if (filters?.region) {
      whereClause.region = filters.region;
    }

    // Apply search filter
    if (filters?.search) {
      whereClause.name = {
        contains: filters.search,
        mode: 'insensitive'
      };
    }

    const subzones = await prisma.subzone.findMany({
      where: whereClause,
      include: {
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    let result = subzones.map(subzone => ({
      id: subzone.id,
      subzoneId: subzone.subzoneId,
      name: subzone.name,
      region: subzone.region,
      geometryPolygon: subzone.geometryPolygon,
      centroid: subzone.centroid,
      radii: subzone.radii,
      score: subzone.scores[0] ? {
        H: subzone.scores[0].H,
        percentile: subzone.scores[0].percentile,
        zDemand: subzone.scores[0].zDemand,
        zSupply: subzone.scores[0].zSupply,
        zAccess: subzone.scores[0].zAccess
      } : undefined
    }));

    // Apply percentile filter
    if (filters?.percentile) {
      result = result.filter(subzone => 
        subzone.score && subzone.score.percentile <= filters.percentile!
      );
    }

    return result;

  } catch (error) {
    console.error('Error fetching subzones:', error);
    throw error;
  }
}

// Get subzone by ID
export async function getSubzoneById(subzoneId: string): Promise<SubzoneWithScore | null> {
  try {
    const subzone = await prisma.subzone.findUnique({
      where: { subzoneId },
      include: {
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!subzone) {
      return null;
    }

    return {
      id: subzone.id,
      subzoneId: subzone.subzoneId,
      name: subzone.name,
      region: subzone.region,
      geometryPolygon: subzone.geometryPolygon,
      centroid: subzone.centroid,
      radii: subzone.radii,
      score: subzone.scores[0] ? {
        H: subzone.scores[0].H,
        percentile: subzone.scores[0].percentile,
        zDemand: subzone.scores[0].zDemand,
        zSupply: subzone.scores[0].zSupply,
        zAccess: subzone.scores[0].zAccess
      } : undefined
    };

  } catch (error) {
    console.error('Error fetching subzone:', error);
    throw error;
  }
}

// Get detailed subzone information
export async function getSubzoneDetails(subzoneId: string): Promise<SubzoneDetails | null> {
  try {
    const subzone = await prisma.subzone.findUnique({
      where: { subzoneId },
      include: {
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!subzone) {
      return null;
    }

    const centroid = subzone.centroid as { coordinates: [number, number] };

    // Get demographics
    const populationPoints = await prisma.populationPoint.findMany({
      where: { subzoneId }
    });

    const demographics = populationPoints.length > 0 ? {
      total: populationPoints.reduce((sum, point) => sum + point.residentCount, 0),
      ageGroups: {
        age0_14: populationPoints.reduce((sum, point) => sum + point.age0_14, 0),
        age15_64: populationPoints.reduce((sum, point) => sum + point.age15_64, 0),
        age65p: populationPoints.reduce((sum, point) => sum + point.age65p, 0)
      }
    } : undefined;

    // Get nearby hawker centres (within 2km)
    const hawkerCentres = await prisma.hawkerCentre.findMany({
      where: { status: 'active' }
    });

    const nearbyHawkerCentres = hawkerCentres
      .map(centre => {
        const location = centre.location as { coordinates: [number, number] };
        const distance = calculateDistance(centroid.coordinates, location.coordinates);
        return { ...centre, distance };
      })
      .filter(centre => centre.distance <= 2000) // Within 2km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10) // Top 10 closest
      .map(centre => ({
        id: centre.id,
        name: centre.name,
        distance: Math.round(centre.distance),
        capacity: centre.capacity
      }));

    // Get nearby MRT stations (within 2km)
    const mrtStations = await prisma.mRTStation.findMany();
    const nearbyMRTStations = mrtStations
      .map(station => {
        const location = station.location as { coordinates: [number, number] };
        const distance = calculateDistance(centroid.coordinates, location.coordinates);
        return { ...station, distance };
      })
      .filter(station => station.distance <= 2000) // Within 2km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5) // Top 5 closest
      .map(station => ({
        id: station.id,
        name: station.name,
        distance: Math.round(station.distance),
        lineCount: station.lineCount
      }));

    // Get nearby bus stops (within 1km)
    const busStops = await prisma.busStop.findMany();
    const nearbyBusStops = busStops
      .map(stop => {
        const location = stop.location as { coordinates: [number, number] };
        const distance = calculateDistance(centroid.coordinates, location.coordinates);
        return { ...stop, distance };
      })
      .filter(stop => stop.distance <= 1000) // Within 1km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10) // Top 10 closest
      .map(stop => ({
        id: stop.id,
        code: stop.stopCode,
        distance: Math.round(stop.distance),
        freqWeight: stop.freqWeight
      }));

    return {
      id: subzone.id,
      subzoneId: subzone.subzoneId,
      name: subzone.name,
      region: subzone.region,
      geometryPolygon: subzone.geometryPolygon,
      centroid: subzone.centroid,
      radii: subzone.radii,
      demographics,
      hawkerCentres: nearbyHawkerCentres,
      mrtStations: nearbyMRTStations,
      busStops: nearbyBusStops,
      score: subzone.scores[0] ? {
        H: subzone.scores[0].H,
        percentile: subzone.scores[0].percentile,
        zDemand: subzone.scores[0].zDemand,
        zSupply: subzone.scores[0].zSupply,
        zAccess: subzone.scores[0].zAccess,
        wD: subzone.scores[0].wD,
        wS: subzone.scores[0].wS,
        wA: subzone.scores[0].wA
      } : undefined
    };

  } catch (error) {
    console.error('Error fetching subzone details:', error);
    throw error;
  }
}

// Search subzones by name
export async function searchSubzones(query: string): Promise<SubzoneWithScore[]> {
  try {
    const subzones = await prisma.subzone.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        scores: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 10 // Limit results
    });

    return subzones.map(subzone => ({
      id: subzone.id,
      subzoneId: subzone.subzoneId,
      name: subzone.name,
      region: subzone.region,
      geometryPolygon: subzone.geometryPolygon,
      centroid: subzone.centroid,
      radii: subzone.radii,
      score: subzone.scores[0] ? {
        H: subzone.scores[0].H,
        percentile: subzone.scores[0].percentile,
        zDemand: subzone.scores[0].zDemand,
        zSupply: subzone.scores[0].zSupply,
        zAccess: subzone.scores[0].zAccess
      } : undefined
    }));

  } catch (error) {
    console.error('Error searching subzones:', error);
    throw error;
  }
}

// Get all regions
export async function getAllRegions(): Promise<string[]> {
  try {
    const regions = await prisma.subzone.findMany({
      select: { region: true },
      distinct: ['region']
    });

    return regions.map(r => r.region).sort();

  } catch (error) {
    console.error('Error fetching regions:', error);
    throw error;
  }
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
