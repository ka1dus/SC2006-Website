/**
 * Idempotent layer management utilities for subzone rendering
 * Part A: Stabilize subzone rendering with module-level state
 */

import bbox from "@turf/bbox";
import type { Map as MapLibreMap } from "maplibre-gl";
import { generateFillColorExpression } from "@/utils/geojson/colorScales";

export const SRC = "subzones";
export const FILL = "subzones-fill";
export const OUTL = "subzones-outline";
export const SEL = "subzones-selected";

/**
 * Find the first symbol layer ID to insert our layers above the basemap
 */
export function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers || [];
  const sym = layers.find((l: any) => l.type === "symbol");
  return sym?.id;
}

/**
 * Idempotent: Add or update source and layers
 */
export function upsertSubzones(
  map: MapLibreMap,
  fc: any,
  breaks: number[],
  selectedIds: string[]
) {
  const beforeId = firstSymbolLayerId(map);

  // Source
  if (!map.getSource(SRC)) {
    map.addSource(SRC, { type: "geojson", data: fc, promoteId: "id" });
    console.log("[layers] source added");
  } else {
    (map.getSource(SRC) as any).setData(fc);
    console.log("[layers] source updated");
  }

  // Fill layer
  if (!map.getLayer(FILL)) {
    map.addLayer({
      id: FILL,
      type: "fill",
      source: SRC,
      paint: {
        "fill-color": generateFillColorExpression(breaks),
        "fill-opacity": 0.65,
      },
    }, beforeId);
    console.log("[layers] fill layer added");
  } else {
    map.setPaintProperty(FILL, "fill-color", generateFillColorExpression(breaks));
    map.setPaintProperty(FILL, "fill-opacity", 0.65);
    console.log("[layers] fill layer updated");
  }

  // Outline layer
  if (!map.getLayer(OUTL)) {
    map.addLayer({
      id: OUTL,
      type: "line",
      source: SRC,
      paint: {
        "line-color": "#374151",
        "line-width": 0.6,
      },
    }, beforeId);
    console.log("[layers] outline layer added");
  }

  // Selected layer
  if (!map.getLayer(SEL)) {
    map.addLayer({
      id: SEL,
      type: "line",
      source: SRC,
      filter: ["in", ["get", "id"], ["literal", selectedIds]],
      paint: {
        "line-color": "#f59e0b",
        "line-width": 3,
      },
    }, beforeId);
    console.log("[layers] selected layer added");
  } else {
    map.setFilter(SEL, ["in", ["get", "id"], ["literal", selectedIds]]);
    console.log("[layers] selected filter updated");
  }

  console.log("[layers] upsert complete:", {
    src: map.getSource(SRC) ? "exists" : "missing",
    fill: map.getLayer(FILL) ? "exists" : "missing",
    outline: map.getLayer(OUTL) ? "exists" : "missing",
    selected: map.getLayer(SEL) ? "exists" : "missing",
  });
}

/**
 * Fit bounds once to avoid repeated fitting on Fast Refresh
 */
export function fitOnce(map: MapLibreMap, fc: any) {
  if ((window as any).__fitOnce) {
    console.log("[layers] fit skipped (already done)");
    return;
  }

  try {
    const b = bbox(fc) as [number, number, number, number];
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 24, duration: 0 });
    (window as any).__fitOnce = true;
    console.log("[layers] bounds fitted:", b);
  } catch (error) {
    console.error("[layers] fit error:", error);
  }
}

