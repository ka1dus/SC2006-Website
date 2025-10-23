/**
 * Map Token Service
 * Safely retrieves and validates Mapbox token at runtime
 */

/**
 * Get Mapbox token from environment
 * Returns null if missing or empty
 */
export function getMapboxToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  
  if (!token || token.length === 0) {
    return null;
  }

  return token;
}

/**
 * Validate token format (basic check)
 * Mapbox public tokens start with "pk."
 */
export function isValidMapboxTokenFormat(token: string | null): boolean {
  if (!token) return false;
  return token.startsWith('pk.');
}

/**
 * Check if we should use MapLibre fallback
 */
export function shouldUseMapLibreFallback(): boolean {
  const token = getMapboxToken();
  
  // No token → use MapLibre
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.info('ℹ️ No Mapbox token found, using MapLibre fallback');
    }
    return true;
  }

  // Invalid format (secret token or malformed) → use MapLibre
  if (!isValidMapboxTokenFormat(token)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Mapbox token format invalid (should start with pk.), using MapLibre fallback');
    }
    return true;
  }

  // Token looks valid → try Mapbox
  return false;
}

