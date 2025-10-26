/**
 * BaseMap Component
 * Automatically chooses between Mapbox (with token) or MapLibre (token-free OSM)
 * Task 3.MAPBOX-TOKEN-FIX: Graceful fallback when token is invalid/missing
 */

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapboxToken, shouldUseMapLibreFallback } from '@/services/mapTokens';

export type MapProvider = 'mapbox' | 'maplibre';
export type MapInstance = mapboxgl.Map | maplibregl.Map;

interface BaseMapProps {
  onReady: (map: MapInstance, provider: MapProvider) => void;
}

export default function BaseMap({ onReady }: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [provider, setProvider] = useState<MapProvider>('mapbox');
  const [mapError, setMapError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);

  // Update ref when onReady changes
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = getMapboxToken();
    const useMapLibre = shouldUseMapLibreFallback();

    // Clear error if using MapLibre
    if (useMapLibre) {
      setMapError(null);
    }

    let map: MapInstance;

    try {
      if (useMapLibre) {
        // MapLibre with OSM style (no token required)
        setProvider('maplibre');
        
        console.info('🗺️ Map provider: MapLibre (OSM)');

        map = new maplibregl.Map({
          container: containerRef.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [103.8198, 1.3521], // Singapore
          zoom: 10.5,
        });
      } else {
        // Mapbox with token
        setProvider('mapbox');
        
        console.info('🗺️ Map provider: Mapbox (dark style)');

        (mapboxgl as any).accessToken = token!;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [103.8198, 1.3521], // Singapore
          zoom: 10.2,
        });

        // Verify token (non-blocking)
        map.once('error', (e: any) => {
          const message = e.error?.message || String(e);
          
          if (message.includes('token') || message.includes('Unauthorized')) {
            console.error('Mapbox token error:', message);
            setMapError('Mapbox token may be invalid or lack required scopes (styles:read, tiles:read)');
          } else {
            console.error('Mapbox error:', e);
          }
        });
        
        // Clear error on successful load
        map.once('load', () => {
          setMapError(null);
        });
      }

      // Add navigation controls
      const NavigationControl = useMapLibre 
        ? (maplibregl as any).NavigationControl 
        : (mapboxgl as any).NavigationControl;
      map.addControl(new NavigationControl(), 'top-left');

      // Notify parent when map is ready
      map.once('load', () => {
        console.info(`✅ ${useMapLibre ? 'MapLibre' : 'Mapbox'} map loaded successfully`);
        onReadyRef.current(map, useMapLibre ? 'maplibre' : 'mapbox');
      });

      mapRef.current = map;

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError(`Map initialization failed: ${error}`);
    }
  }, []); // Only run once on mount

  // Task: Don't show error panel when using MapLibre
  const shouldShowError = mapError && provider !== 'maplibre';

  if (shouldShowError) {
    return (
      <div
        style={{
          height: '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 8,
          padding: 24,
          color: '#fbbf24',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Map Initialization Warning</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>{mapError}</div>
          <div
            style={{
              fontSize: 12,
              color: '#64748b',
              background: 'rgba(15, 23, 42, 0.5)',
              padding: 12,
              borderRadius: 6,
              textAlign: 'left',
              fontFamily: 'monospace',
            }}
          >
            <div>💡 To fix:</div>
            <div>1. Add valid Mapbox token to .env.local:</div>
            <div style={{ marginLeft: 16 }}>NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here</div>
            <div>2. Or set NEXT_PUBLIC_USE_MAPLIBRE=1 to force MapLibre</div>
            <div>3. Restart Next.js dev server</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
        }}
      />
      
      {/* Token-free basemap banner */}
      {provider === 'maplibre' && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            padding: '6px 12px',
            fontSize: 12,
            background: 'rgba(251, 191, 36, 0.9)',
            color: '#78350f',
            border: '1px solid rgba(251, 191, 36, 0.5)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            maxWidth: 320,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>ℹ️ Token-Free Basemap</div>
          <div style={{ fontSize: 11, lineHeight: 1.4 }}>
            Using MapLibre + OSM. Add a valid <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: 3 }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable Mapbox dark style.
          </div>
        </div>
      )}
    </div>
  );
}

