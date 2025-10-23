/**
 * MapContainer Component
 * Main Mapbox GL map with subzone polygons, hover, and click interactions
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FeatureCollection } from '@/services/subzones';
import {
  computeQuantiles,
  generateFillColorExpression,
  formatPopulation,
} from '@/utils/geojson/colorScales';
import {
  createFillLayer,
  createLineLayer,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from '@/utils/geojson/mapLayers';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapContainerProps {
  geojson: FeatureCollection;
  selectedIds: string[];
  hoverId: string | null;
  onFeatureClick: (id: string) => void;
  onFeatureHover: (id: string | null) => void;
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update GeoJSON source and layers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Compute quantiles for color scale
    const breaks = computeQuantiles(geojson.features);
    const fillColorExpression = generateFillColorExpression(breaks);

    // Add or update source
    const source = map.getSource('subzones') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource('subzones', {
        type: 'geojson',
        data: geojson,
      });
    }

    // Remove existing layers if they exist
    if (map.getLayer('subzones-fill')) {
      map.removeLayer('subzones-fill');
    }
    if (map.getLayer('subzones-line')) {
      map.removeLayer('subzones-line');
    }

    // Add layers
    map.addLayer(createFillLayer(fillColorExpression, selectedIds, hoverId));
    map.addLayer(createLineLayer(selectedIds, hoverId));

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
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [mapLoaded, geojson, selectedIds, hoverId]);

  // Update layers when selection or hover changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const breaks = computeQuantiles(geojson.features);
    const fillColorExpression = generateFillColorExpression(breaks);

    if (map.getLayer('subzones-fill')) {
      map.removeLayer('subzones-fill');
    }
    if (map.getLayer('subzones-line')) {
      map.removeLayer('subzones-line');
    }

    map.addLayer(createFillLayer(fillColorExpression, selectedIds, hoverId));
    map.addLayer(createLineLayer(selectedIds, hoverId));
  }, [selectedIds, hoverId, geojson.features, mapLoaded]);

  // Handle mouse events
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

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
  }, [mapLoaded, onFeatureClick, onFeatureHover]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFeatureHover(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFeatureHover]);

  return (
    <div className="map-container" ref={mapContainerRef} />
  );
}

