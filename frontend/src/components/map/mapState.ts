/**
 * Map State Machine (Module-level singleton to survive HMR)
 * Part A: Prevent race conditions and duplicate initialization
 */

import type { Map as MapLibreMap } from "maplibre-gl";

// Module-level globals (survive Fast Refresh, avoid duplication)
let mapInstance: MapLibreMap | null = null;
let mapReady = false;

/**
 * Get the singleton map instance
 */
export function getMap(): MapLibreMap | null {
  return mapInstance;
}

/**
 * Check if the map is ready (has fired 'load' event)
 */
export function isMapReady(): boolean {
  return mapReady;
}

/**
 * Set the map instance and mark as ready
 * Should only be called once from BaseMap
 */
export function setMapInstance(map: MapLibreMap) {
  if (mapInstance) {
    console.warn("[map-state] map instance already exists, skipping duplicate init");
    return;
  }
  
  mapInstance = map;
  mapReady = false;
  
  map.once("load", () => {
    mapReady = true;
    console.info("[map] load ready");
  });
  
  map.once("error", (e: any) => {
    console.error("[map-state] map error:", e);
  });
}

/**
 * Reset map state (for testing or full page navigation)
 */
export function resetMapState() {
  if (mapInstance) {
    console.info("[map-state] resetting map state");
    mapInstance.remove();
  }
  mapInstance = null;
  mapReady = false;
}

