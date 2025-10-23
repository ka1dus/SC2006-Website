/**
 * Geospatial Utilities
 * Point-in-polygon matching for assigning subzoneId to point features
 * Task: DATASET-AUDIT-AND-INGEST P2/P3
 */

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon, multiPolygon } from '@turf/helpers';
import prisma from '../../../db';

/**
 * Cache of subzone geometries for fast lookup
 */
interface SubzoneGeometry {
  id: string;
  name: string;
  geometry: any; // GeoJSON geometry
}

let geometryCache: SubzoneGeometry[] | null = null;

/**
 * Load all subzone geometries from database
 */
export async function loadSubzoneGeometries(): Promise<SubzoneGeometry[]> {
  if (geometryCache) {
    return geometryCache;
  }

  const subzones = await prisma.subzone.findMany({
    select: {
      id: true,
      name: true,
      geomGeoJSON: true,
    },
  });

  geometryCache = subzones
    .filter(s => s.geomGeoJSON !== null)
    .map(s => ({
      id: s.id,
      name: s.name,
      geometry: s.geomGeoJSON,
    }));

  console.log(`📍 Loaded ${geometryCache.length} subzone geometries for point-in-polygon matching`);
  
  return geometryCache;
}

/**
 * Clear geometry cache (useful for tests or after subzone updates)
 */
export function clearGeometryCache(): void {
  geometryCache = null;
}

/**
 * Find which subzone contains a given point
 * @param coordinates [longitude, latitude] (WGS84)
 * @returns subzoneId or null if not found
 */
export async function findSubzoneForPoint(coordinates: [number, number]): Promise<string | null> {
  const geometries = await loadSubzoneGeometries();
  
  if (geometries.length === 0) {
    console.warn('⚠️  No subzone geometries loaded. Cannot perform point-in-polygon matching.');
    return null;
  }

  const pt = point(coordinates);

  // Check each subzone polygon
  for (const subzone of geometries) {
    try {
      let isInside = false;

      if (subzone.geometry.type === 'Polygon') {
        const poly = polygon(subzone.geometry.coordinates);
        isInside = booleanPointInPolygon(pt, poly);
      } else if (subzone.geometry.type === 'MultiPolygon') {
        const mpoly = multiPolygon(subzone.geometry.coordinates);
        isInside = booleanPointInPolygon(pt, mpoly);
      }

      if (isInside) {
        return subzone.id;
      }
    } catch (error) {
      console.error(`Error checking point in subzone ${subzone.id}:`, error);
    }
  }

  return null; // Point not in any subzone
}

/**
 * Batch find subzones for multiple points
 * More efficient than calling findSubzoneForPoint repeatedly
 */
export async function findSubzonesForPoints(
  points: Array<{ id: string; coordinates: [number, number] }>
): Promise<Map<string, string | null>> {
  const geometries = await loadSubzoneGeometries();
  const results = new Map<string, string | null>();

  if (geometries.length === 0) {
    console.warn('⚠️  No subzone geometries loaded. Cannot perform point-in-polygon matching.');
    points.forEach(p => results.set(p.id, null));
    return results;
  }

  for (const pointData of points) {
    const pt = point(pointData.coordinates);
    let foundSubzone: string | null = null;

    for (const subzone of geometries) {
      try {
        let isInside = false;

        if (subzone.geometry.type === 'Polygon') {
          const poly = polygon(subzone.geometry.coordinates);
          isInside = booleanPointInPolygon(pt, poly);
        } else if (subzone.geometry.type === 'MultiPolygon') {
          const mpoly = multiPolygon(subzone.geometry.coordinates);
          isInside = booleanPointInPolygon(pt, mpoly);
        }

        if (isInside) {
          foundSubzone = subzone.id;
          break; // Found match, stop searching
        }
      } catch (error) {
        console.error(`Error checking point ${pointData.id} in subzone ${subzone.id}:`, error);
      }
    }

    results.set(pointData.id, foundSubzone);
  }

  return results;
}

/**
 * Extract coordinates from GeoJSON Point geometry
 */
export function extractPointCoordinates(geometry: any): [number, number] | null {
  if (!geometry || geometry.type !== 'Point') {
    return null;
  }

  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }

  return [coords[0], coords[1]];
}

/**
 * Create GeoJSON Point from coordinates
 */
export function createPointGeometry(longitude: number, latitude: number): any {
  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
}

