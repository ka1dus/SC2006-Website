/**
 * Coordinate Reference System (CRS) Detection and Conversion
 * Handles SVY21 (EPSG:3414) → WGS84 (EPSG:4326) conversion
 * Part C.FIX: Hawker centres CRS handling
 */

import proj4 from 'proj4';

export type CRS = "WGS84" | "SVY21" | "UNKNOWN";

// EPSG:3414 (SVY21) projection string
const SVY21_PROJ = "+proj=tmerc +lat_0=1.366666 +lon_0=103.833333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs";
const WGS84_PROJ = proj4.WGS84;

/**
 * Detect CRS from coordinate values
 * @param lng longitude/x coordinate
 * @param lat latitude/y coordinate
 * @returns detected CRS
 */
export function detectCRS(lng: number, lat: number): CRS {
  // WGS84 around Singapore ≈ [103.6..104.1], [1.2..1.5]
  if (lng > 103 && lng < 105 && lat > 1 && lat < 2) {
    return "WGS84";
  }
  
  // SVY21 (EPSG:3414) typical ranges: x≈ 10000..50000, y≈ 25000..50000 (in meters)
  if (lng > 5000 && lng < 200000 && lat > 5000 && lat < 200000) {
    return "SVY21";
  }
  
  return "UNKNOWN";
}

/**
 * Convert SVY21 coordinates to WGS84 longitude/latitude
 * @param x SVY21 x coordinate (meters)
 * @param y SVY21 y coordinate (meters)
 * @returns [longitude, latitude] in WGS84
 */
export function toLonLatFromSVY21(x: number, y: number): [number, number] {
  const [lon, lat] = proj4(SVY21_PROJ, WGS84_PROJ, [x, y]);
  return [lon, lat];
}

/**
 * Convert coordinates to WGS84 if needed
 * @param lng longitude/x coordinate
 * @param lat latitude/y coordinate
 * @returns [longitude, latitude] in WGS84
 */
export function ensureWGS84(lng: number, lat: number): [number, number] {
  const crs = detectCRS(lng, lat);
  
  if (crs === "SVY21") {
    return toLonLatFromSVY21(lng, lat);
  }
  
  return [lng, lat];
}

/**
 * Sample coordinates for CRS detection testing
 */
export const TEST_COORDINATES = {
  WGS84: {
    singapore: [103.8198, 1.3521] as [number, number],
    marinaBay: [103.8650, 1.2819] as [number, number],
  },
  SVY21: {
    singapore: [28994.5, 29547.4] as [number, number],
    marinaBay: [28001.6, 38744.6] as [number, number],
  }
};
