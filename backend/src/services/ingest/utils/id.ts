/**
 * Stable ID Generation Utilities
 * Part D: Generate deterministic IDs for point features
 */

/**
 * Generate a stable ID from name and coordinates
 * Format: NAME:LONGITUDE,LATITUDE
 * @param name Optional name/identifier
 * @param lng Longitude
 * @param lat Latitude
 * @returns Stable ID string
 */
export function stableIdFrom(name: string | undefined, lng: number, lat: number): string {
  const n = (name || "").trim().toUpperCase().replace(/\s+/g, "_").slice(0, 60);
  const L = (v: number) => v.toFixed(6);
  return `${n}:${L(lng)},${L(lat)}`;
}

/**
 * Generate a stable ID for MRT exit
 * Format: STATION_CODE:LONGITUDE,LATITUDE
 */
export function stableMRTExitId(station: string | undefined, code: string | undefined, lng: number, lat: number): string {
  const name = code || station || "";
  return stableIdFrom(name, lng, lat);
}

/**
 * Generate a stable ID for bus stop
 * Format: NAME:LONGITUDE,LATITUDE or STOPCODE:LONGITUDE,LATITUDE
 */
export function stableBusStopId(name: string | undefined, road: string | undefined, lng: number, lat: number): string {
  const identifier = name || road || "";
  return stableIdFrom(identifier, lng, lat);
}
