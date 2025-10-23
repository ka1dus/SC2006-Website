/**
 * MapContainer Component
 * Main Mapbox GL map with subzone polygons, hover, and click interactions
 * Task 3.MAP-NOT-VISIBLE fixes: validation, diagnostics, proper layer management
 */

"use client";

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { FeatureCollection } from '@/services/subzones';
import {
  computeQuantiles,
  generateFillColorExpression,
  formatPopulation,
} from '@/utils/geojson/colorScales';
import { SINGAPORE_BOUNDS } from '@/utils/geojson/mapLayers';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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
  const bbox: number[] = [Infinity, Infinity, -Infinity, -Infinity]; // [minX, minY, maxX, maxY]

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
      // Update bbox
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
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

    if (validation.stats.count === 0) {
      setMapError('No features loaded in GeoJSON');
    } else if (!validation.valid) {
      setMapError(`GeoJSON validation failed: ${validation.errors[0]}`);
    }
  }, [geojson]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [103.8198, 1.3521], // Singapore center
        zoom: 10.5,
      });

      map.on('load', () => {
        if (process.env.NODE_ENV === 'development') {
          console.info('✅ Mapbox map loaded');
        }
        setMapLoaded(true);
      });

      map.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError(`Mapbox error: ${e.error?.message || 'Unknown'}`);
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-left');

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        layersAddedRef.current = false;
      };
    } catch (error) {
      console.error('Failed to initialize Mapbox:', error);
      setMapError(`Failed to initialize map: ${error}`);
    }
  }, []);

  // Add GeoJSON source and layers (ONCE after map loads)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || layersAddedRef.current) return;

    const map = mapRef.current;

    try {
      // Compute quantiles for color scale
      const breaks = computeQuantiles(geojson.features);
      const fillColorExpression = generateFillColorExpression(breaks);

      if (process.env.NODE_ENV === 'development') {
        console.info('🎨 Computed quantiles:', breaks);
      }

      // Add source with promoteId for feature-state
      map.addSource('subzones', {
        type: 'geojson',
        data: geojson,
        promoteId: 'id', // CRITICAL for feature-state/hover
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

      // Add selected highlight layer (initially empty filter)
      map.addLayer({
        id: 'subzones-selected',
        type: 'line',
        source: 'subzones',
        filter: ['in', ['get', 'id'], ['literal', []]], // Empty initially
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
        },
      });

      layersAddedRef.current = true;

      // Fit bounds to show all features
      if (geojson.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        geojson.features.forEach((feature) => {
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach((coord: number[]) => {
              bounds.extend(coord as [number, number]);
            });
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: number[][][]) => {
              polygon[0].forEach((coord: number[]) => {
                bounds.extend(coord as [number, number]);
              });
            });
          }
        });
        
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 50, duration: 1000 });
        } else {
          // Fallback to Singapore bounds
          map.fitBounds(SINGAPORE_BOUNDS, { padding: 50, duration: 1000 });
        }
      } else {
        map.fitBounds(SINGAPORE_BOUNDS, { padding: 50, duration: 1000 });
      }

      if (process.env.NODE_ENV === 'development') {
        console.info('✅ Layers added:', map.getStyle().layers.map(l => l.id));
      }
    } catch (error) {
      console.error('Failed to add layers:', error);
      setMapError(`Failed to add layers: ${error}`);
    }
  }, [mapLoaded, geojson]);

  // Update selection filter when selectedIds change
  useEffect(() => {
    if (!mapRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;

    try {
      if (map.getLayer('subzones-selected')) {
        map.setFilter('subzones-selected', ['in', ['get', 'id'], ['literal', selectedIds]]);
      }
    } catch (error) {
      console.error('Failed to update selection filter:', error);
    }
  }, [selectedIds]);

  // Update source data when geojson changes (without re-adding layers)
  useEffect(() => {
    if (!mapRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;
    const source = map.getSource('subzones') as mapboxgl.GeoJSONSource;
    
    if (source) {
      try {
        source.setData(geojson);
        if (process.env.NODE_ENV === 'development') {
          console.info('🔄 Source data updated');
        }
      } catch (error) {
        console.error('Failed to update source data:', error);
      }
    }
  }, [geojson]);

  // Handle mouse events
  useEffect(() => {
    if (!mapRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['subzones-fill'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties;
        
        if (props) {
          const id = props.id;
          onFeatureHover(id);

          // Show tooltip
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

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
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
  }, [layersAddedRef.current, onFeatureClick, onFeatureHover]);

  if (mapError) {
    return (
      <div
        style={{
          height: '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          padding: 24,
          color: '#ef4444',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Map Error</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>{mapError}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="map-container map-root"
      id="map-root"
      ref={mapContainerRef}
      style={{ position: 'relative', width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' }}
    />
  );
}
