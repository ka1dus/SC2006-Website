/**
 * MapContainer Component
 * Main map with subzone polygons, hover, and click interactions
 * Task 3.MAPBOX-TOKEN-FIX: Uses BaseMap for automatic Mapbox/MapLibre fallback
 */

"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { FeatureCollection } from '@/services/subzones';
import {
  computeQuantiles,
  generateFillColorExpression,
  formatPopulation,
} from '@/utils/geojson/colorScales';
import BaseMap, { type MapInstance, type MapProvider } from './BaseMap';

interface MapContainerProps {
  geojson: FeatureCollection;
  selectedIds: string[];
  hoverId: string | null;
  onFeatureClick: (id: string) => void;
  onFeatureHover: (id: string | null) => void;
}

/**
 * Validate FeatureCollection structure
 */
function validateFeatureCollection(fc: FeatureCollection): {
  valid: boolean;
  errors: string[];
  stats: { count: number; nullPopCount: number; bbox: number[] | null };
} {
  const errors: string[] = [];
  let nullPopCount = 0;
  const bbox: number[] = [Infinity, Infinity, -Infinity, -Infinity];

  if (fc.type !== 'FeatureCollection') {
    errors.push(`Invalid type: ${fc.type}, expected FeatureCollection`);
  }

  if (!fc.features || !Array.isArray(fc.features)) {
    errors.push('Missing or invalid features array');
    return { valid: false, errors, stats: { count: 0, nullPopCount: 0, bbox: null } };
  }

  fc.features.forEach((feature, idx) => {
    if (!feature.properties || !feature.properties.id) {
      errors.push(`Feature ${idx}: missing properties.id`);
    }

    if (!feature.geometry) {
      errors.push(`Feature ${idx}: missing geometry`);
    } else if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      errors.push(`Feature ${idx}: invalid geometry type ${feature.geometry.type}`);
    } else {
      const coords = feature.geometry.type === 'Polygon' 
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0][0];
      
      coords.forEach((coord: number[]) => {
        if (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) {
          errors.push(`Feature ${idx}: invalid coordinates [${coord[0]}, ${coord[1]}]`);
        }
        bbox[0] = Math.min(bbox[0], coord[0]);
        bbox[1] = Math.min(bbox[1], coord[1]);
        bbox[2] = Math.max(bbox[2], coord[0]);
        bbox[3] = Math.max(bbox[3], coord[1]);
      });
    }

    if (feature.properties?.populationTotal === null) {
      nullPopCount++;
    }
  });

  const valid = errors.length === 0;
  const stats = {
    count: fc.features.length,
    nullPopCount,
    bbox: valid && fc.features.length > 0 ? bbox : null,
  };

  return { valid, errors, stats };
}

export function MapContainer({
  geojson,
  selectedIds,
  hoverId,
  onFeatureClick,
  onFeatureHover,
}: MapContainerProps) {
  const mapRef = useRef<MapInstance | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [provider, setProvider] = useState<MapProvider>('mapbox');
  const layersAddedRef = useRef(false);

  // Validate GeoJSON on mount
  useEffect(() => {
    const validation = validateFeatureCollection(geojson);
    
    if (process.env.NODE_ENV === 'development') {
      if (validation.valid) {
        console.info('✅ GeoJSON validated OK:', validation.stats);
      } else {
        console.error('❌ GeoJSON validation failed:', validation.errors);
      }
    }
  }, [geojson]);

  // Handle map ready callback
  const handleMapReady = useCallback((map: MapInstance, mapProvider: MapProvider) => {
    mapRef.current = map;
    setProvider(mapProvider);
    setMapReady(true);

    if (process.env.NODE_ENV === 'development') {
      console.info(`🗺️ Map ready with ${mapProvider} provider`);
    }
  }, []);

  // Add GeoJSON source and layers (ONCE after map is ready)
  useEffect(() => {
    if (!mapRef.current || !mapReady || layersAddedRef.current) return;

    const map = mapRef.current as any;

    try {
      // Compute quantiles for color scale
      const breaks = computeQuantiles(geojson.features);
      const fillColorExpression = generateFillColorExpression(breaks);

      if (process.env.NODE_ENV === 'development') {
        console.info('🎨 Computed quantiles:', breaks);
      }

      // Add source with promoteId
      map.addSource('subzones', {
        type: 'geojson',
        data: geojson,
        promoteId: 'id',
      });

      // Add fill layer
      map.addLayer({
        id: 'subzones-fill',
        type: 'fill',
        source: 'subzones',
        paint: {
          'fill-color': fillColorExpression,
          'fill-opacity': 0.7,
        },
      });

      // Add outline layer
      map.addLayer({
        id: 'subzones-outline',
        type: 'line',
        source: 'subzones',
        paint: {
          'line-color': '#60a5fa',
          'line-width': 1,
        },
      });

      // Add selected highlight layer
      map.addLayer({
        id: 'subzones-selected',
        type: 'line',
        source: 'subzones',
        filter: ['in', ['get', 'id'], ['literal', []]],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
        },
      });

      layersAddedRef.current = true;

      // Fit bounds
      if (geojson.features.length > 0) {
        const bounds: any = [Infinity, Infinity, -Infinity, -Infinity];
        geojson.features.forEach((feature) => {
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach((coord: number[]) => {
              bounds[0] = Math.min(bounds[0], coord[0]);
              bounds[1] = Math.min(bounds[1], coord[1]);
              bounds[2] = Math.max(bounds[2], coord[0]);
              bounds[3] = Math.max(bounds[3], coord[1]);
            });
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: number[][][]) => {
              polygon[0].forEach((coord: number[]) => {
                bounds[0] = Math.min(bounds[0], coord[0]);
                bounds[1] = Math.min(bounds[1], coord[1]);
                bounds[2] = Math.max(bounds[2], coord[0]);
                bounds[3] = Math.max(bounds[3], coord[1]);
              });
            });
          }
        });

        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 50, duration: 1000 });
      }

      if (process.env.NODE_ENV === 'development') {
        console.info('✅ Layers added:', ['subzones-fill', 'subzones-outline', 'subzones-selected']);
      }
    } catch (error) {
      console.error('Failed to add layers:', error);
    }
  }, [mapReady, geojson]);

  // Update selection filter
  useEffect(() => {
    if (!mapRef.current || !layersAddedRef.current) return;

    const map = mapRef.current as any;

    try {
      if (map.getLayer('subzones-selected')) {
        map.setFilter('subzones-selected', ['in', ['get', 'id'], ['literal', selectedIds]]);
      }
    } catch (error) {
      console.error('Failed to update selection filter:', error);
    }
  }, [selectedIds]);

  // Handle mouse events
  useEffect(() => {
    if (!mapRef.current || !layersAddedRef.current) return;

    const map = mapRef.current as any;

    const handleMouseMove = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['subzones-fill'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties;
        
        if (props) {
          onFeatureHover(props.id);

          if (!tooltipRef.current) {
            tooltipRef.current = document.createElement('div');
            tooltipRef.current.className = 'map-tooltip';
            document.body.appendChild(tooltipRef.current);
          }

          tooltipRef.current.style.left = `${e.point.x + 10}px`;
          tooltipRef.current.style.top = `${e.point.y - 10}px`;
          tooltipRef.current.innerHTML = `
            <div class="map-tooltip-title">${props.name}</div>
            <div class="map-tooltip-row">
              <span class="map-tooltip-label">Region:</span>
              <span class="map-tooltip-value">${props.region}</span>
            </div>
            <div class="map-tooltip-row">
              <span class="map-tooltip-label">Population:</span>
              <span class="map-tooltip-value">${formatPopulation(props.populationTotal)}</span>
            </div>
            ${props.populationYear ? `
            <div class="map-tooltip-row">
              <span class="map-tooltip-label">Year:</span>
              <span class="map-tooltip-value">${props.populationYear}</span>
            </div>
            ` : ''}
          `;

          map.getCanvas().style.cursor = 'pointer';
        }
      } else {
        onFeatureHover(null);
        
        if (tooltipRef.current) {
          tooltipRef.current.remove();
          tooltipRef.current = null;
        }
        
        map.getCanvas().style.cursor = '';
      }
    };

    const handleClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['subzones-fill'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties;
        
        if (props?.id) {
          onFeatureClick(props.id);
        }
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, [mapReady, layersAddedRef.current, onFeatureClick, onFeatureHover]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 200px)',
        minHeight: '500px',
      }}
    >
      <BaseMap onReady={handleMapReady} />
    </div>
  );
}
