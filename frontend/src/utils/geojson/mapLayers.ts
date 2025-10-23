/**
 * Mapbox Layer Configurations
 * Defines fill and line layers for subzone visualization
 */

import type { FillLayer, LineLayer } from 'mapbox-gl';
import { SELECTED_COLOR } from './colorScales';

/**
 * Create fill layer config for subzone polygons
 */
export function createFillLayer(
  fillColorExpression: any[],
  selectedIds: string[] = [],
  hoverId: string | null = null
): FillLayer {
  return {
    id: 'subzones-fill',
    type: 'fill',
    source: 'subzones',
    paint: {
      'fill-color': fillColorExpression,
      'fill-opacity': [
        'case',
        // Selected features
        ['in', ['get', 'id'], ['literal', selectedIds]],
        0.8,
        // Hovered feature
        ['==', ['get', 'id'], hoverId || ''],
        0.6,
        // Default
        0.5,
      ],
    },
  };
}

/**
 * Create line layer config for subzone outlines
 */
export function createLineLayer(
  selectedIds: string[] = [],
  hoverId: string | null = null
): LineLayer {
  return {
    id: 'subzones-line',
    type: 'line',
    source: 'subzones',
    paint: {
      'line-color': [
        'case',
        // Selected features get neon cyan outline
        ['in', ['get', 'id'], ['literal', selectedIds]],
        SELECTED_COLOR,
        // Hovered feature gets light outline
        ['==', ['get', 'id'], hoverId || ''],
        '#94a3b8',
        // Default gray outline
        '#cbd5e1',
      ],
      'line-width': [
        'case',
        // Selected features get thicker outline
        ['in', ['get', 'id'], ['literal', selectedIds]],
        3,
        // Hovered feature gets medium outline
        ['==', ['get', 'id'], hoverId || ''],
        2,
        // Default thin outline
        1,
      ],
    },
  };
}

/**
 * Singapore map bounds (approximate)
 */
export const SINGAPORE_BOUNDS: [[number, number], [number, number]] = [
  [103.6, 1.15], // Southwest
  [104.1, 1.48], // Northeast
];

/**
 * Default map center (Singapore)
 */
export const DEFAULT_CENTER: [number, number] = [103.8198, 1.3521];

/**
 * Default map zoom
 */
export const DEFAULT_ZOOM = 11;

