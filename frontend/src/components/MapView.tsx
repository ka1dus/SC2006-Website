import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import { useMap } from '@/contexts/MapContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewProps {
  className?: string;
}

export default function MapView({ className = '' }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { filters, setSelectedSubzone } = useMap();

  // Fetch subzones data
  const { data: subzones, isLoading, error } = useQuery(
    ['subzones', filters],
    () => subzoneService.getAllSubzones(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [103.8198, 1.3521], // Singapore center
      zoom: 11,
      maxZoom: 18,
      minZoom: 9,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
      toast.error('Failed to load map');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add subzone polygons to map
  useEffect(() => {
    if (!map.current || !mapLoaded || !subzones) return;

    const mapInstance = map.current;

    // Remove existing sources and layers
    if (mapInstance.getSource('subzones')) {
      mapInstance.removeLayer('subzones-fill');
      mapInstance.removeLayer('subzones-stroke');
      mapInstance.removeSource('subzones');
    }

    // Prepare GeoJSON data
    const geojson = {
      type: 'FeatureCollection',
      features: subzones.map(subzone => ({
        type: 'Feature',
        properties: {
          id: subzone.subzoneId,
          name: subzone.name,
          region: subzone.region,
          score: subzone.score?.H || 0,
          percentile: subzone.score?.percentile || 0,
        },
        geometry: subzone.geometryPolygon,
      })),
    };

    // Add source
    mapInstance.addSource('subzones', {
      type: 'geojson',
      data: geojson,
    });

    // Add fill layer (choropleth)
    mapInstance.addLayer({
      id: 'subzones-fill',
      type: 'fill',
      source: 'subzones',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          -1, '#e5e7eb', // Low scores - gray
          0, '#fef3c7', // Medium-low - yellow
          0.5, '#fde68a', // Medium - amber
          1, '#f59e0b', // High - orange
          2, '#d97706', // Very high - dark orange
        ],
        'fill-opacity': 0.7,
      },
    });

    // Add stroke layer
    mapInstance.addLayer({
      id: 'subzones-stroke',
      type: 'line',
      source: 'subzones',
      paint: {
        'line-color': '#ffffff',
        'line-width': 1,
      },
    });

    // Add click handler
    mapInstance.on('click', 'subzones-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const subzone = subzones.find(s => s.subzoneId === feature.properties?.id);
        if (subzone) {
          setSelectedSubzone(subzone);
        }
      }
    });

    // Add hover effects
    mapInstance.on('mouseenter', 'subzones-fill', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });

    mapInstance.on('mouseleave', 'subzones-fill', () => {
      mapInstance.getCanvas().style.cursor = '';
    });

    // Create popup
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    mapInstance.on('mouseenter', 'subzones-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${properties.name}</h3>
              <p class="text-xs text-gray-600">${properties.region}</p>
              ${properties.score !== undefined ? `
                <p class="text-xs mt-1">
                  Score: ${properties.score.toFixed(3)}
                </p>
                <p class="text-xs">
                  Percentile: ${properties.percentile.toFixed(1)}%
                </p>
              ` : ''}
            </div>
          `)
          .addTo(mapInstance);
      }
    });

    mapInstance.on('mouseleave', 'subzones-fill', () => {
      popup.remove();
    });

  }, [mapLoaded, subzones, setSelectedSubzone]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Failed to load map data
          </h3>
          <p className="text-sm text-gray-500">
            Please check your connection and try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">Loading map data...</p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Legend */}
      {mapLoaded && subzones && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Hawker Opportunity Score
          </h3>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-xs text-gray-600">Low (≤ 0)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span className="text-xs text-gray-600">Medium-Low (0-0.5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <span className="text-xs text-gray-600">Medium (0.5-1)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span className="text-xs text-gray-600">High (1-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-600 rounded"></div>
              <span className="text-xs text-gray-600">Very High (> 2)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
