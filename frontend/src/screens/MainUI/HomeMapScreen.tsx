/**
 * HomeMapScreen Component
 * Main map experience with subzone visualization and selection
 * ALWAYS renders visible UI - never blank
 */

"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { SubzoneAPI, type FeatureCollection, type SubzoneListItem, type QuantilesResponse } from '@/services/subzones';
import { apiGet } from '@/services/api';
import { useSubzoneSelection } from '@/utils/hooks/useSubzoneSelection';
import { useMapHoverFeature } from '@/utils/hooks/useMapHoverFeature';
import { MapContainer } from './components/MapContainer';
import { MapLegend } from './components/MapLegend';
import { SelectionTray } from './components/SelectionTray';
import { ClearAllButton } from './components/ClearAllButton';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import DiagBanner from './components/DiagBanner';
import { DataStatusPanel } from './components/DataStatusPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface DiagStatus {
  subzones: number;
  populations: number;
  unmatched: number;
  geo: {
    ok: boolean;
    features: number;
    sampleIds: string[];
    error?: string;
  };
}

export function HomeMapScreen() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [geoState, setGeoState] = useState<'loading' | 'ok' | 'fallback-ok' | 'geo-failed'>('loading');
  const [selectedSubzones, setSelectedSubzones] = useState<SubzoneListItem[]>([]);
  const [diagStatus, setDiagStatus] = useState<DiagStatus | null>(null);
  const [quantiles, setQuantiles] = useState<QuantilesResponse | null>(null);

  const selection = useSubzoneSelection(2);
  const hover = useMapHoverFeature();

  // Fetch quantiles from API (Part E)
  useEffect(() => {
    let mounted = true;

    async function fetchQuantiles() {
      try {
        const data = await SubzoneAPI.getQuantiles(5);
        if (mounted) {
          setQuantiles(data);
          if (process.env.NODE_ENV === 'development') {
            console.info('📊 Quantiles fetched:', data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quantiles:', error);
        // Set fallback empty breaks
        if (mounted) {
          setQuantiles({ k: 5, n: 0, min: 0, max: 0, breaks: [] });
        }
      }
    }

    fetchQuantiles();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch diagnostics status
  useEffect(() => {
    let mounted = true;

    async function fetchDiagStatus() {
      try {
        const status = await apiGet<DiagStatus>('/v1/diag/status');
        if (mounted) {
          setDiagStatus(status);
          if (process.env.NODE_ENV === 'development') {
            console.info('📊 System status:', status);
          }
        }
      } catch (error) {
        console.error('Failed to fetch diag status:', error);
      }
    }

    fetchDiagStatus();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch GeoJSON with fallback strategy (Part E: includes transit counts)
  useEffect(() => {
    let mounted = true;

    async function fetchGeoJSON() {
      try {
        setGeoState('loading');
        const data = await SubzoneAPI.geo({
          fields: ['hawkerCount', 'mrtExitCount', 'busStopCount'],
          simplify: 50, // Reduce coordinate count for performance
        });
        if (mounted) {
          setGeojson(data);
          setGeoState('ok');
          
          // Log diagnostics in dev mode
          if (process.env.NODE_ENV === 'development') {
            const bbox = data.features.length > 0
              ? [
                  Math.min(...data.features.flatMap(f => 
                    f.geometry.type === 'Polygon' 
                      ? f.geometry.coordinates[0].map((c: number[]) => c[0])
                      : f.geometry.coordinates.flatMap((p: number[][][]) => p[0].map((c: number[]) => c[0]))
                  )),
                  Math.min(...data.features.flatMap(f => 
                    f.geometry.type === 'Polygon' 
                      ? f.geometry.coordinates[0].map((c: number[]) => c[1])
                      : f.geometry.coordinates.flatMap((p: number[][][]) => p[0].map((c: number[]) => c[1]))
                  )),
                  Math.max(...data.features.flatMap(f => 
                    f.geometry.type === 'Polygon' 
                      ? f.geometry.coordinates[0].map((c: number[]) => c[0])
                      : f.geometry.coordinates.flatMap((p: number[][][]) => p[0].map((c: number[]) => c[0]))
                  )),
                  Math.max(...data.features.flatMap(f => 
                    f.geometry.type === 'Polygon' 
                      ? f.geometry.coordinates[0].map((c: number[]) => c[1])
                      : f.geometry.coordinates.flatMap((p: number[][][]) => p[0].map((c: number[]) => c[1]))
                  )),
                ]
              : null;
            
            console.info('✅ GeoJSON OK:', {
              count: data.features.length,
              bbox,
            });
          }
        }
      } catch (primaryErr) {
        console.warn('Primary GeoJSON failed, trying fallback:', primaryErr);
        
        // Try fallback public GeoJSON
        try {
          const response = await fetch('/data/subzones.geojson', { cache: 'no-store' });
          if (!response.ok) throw new Error(`Fallback fetch failed: ${response.status}`);
          
          const fallbackData = await response.json();
          if (mounted) {
            setGeojson(fallbackData);
            setGeoState('fallback-ok');
          }
        } catch (fallbackErr) {
          console.error('Fallback GeoJSON also failed:', fallbackErr);
          if (mounted) {
            setGeoState('geo-failed');
          }
        }
      }
    }

    fetchGeoJSON();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Update selected subzones details when selection changes
  useEffect(() => {
    if (!geojson || selection.count === 0) {
      setSelectedSubzones([]);
      return;
    }

    const subzones: SubzoneListItem[] = selection.selected
      .map((id) => {
        const feature = geojson.features.find((f) => f.properties.id === id);
        if (!feature) return null;

        const props = feature.properties;
        return {
          id: props.id,
          name: props.name,
          region: props.region,
          population: props.populationTotal !== null
            ? {
                total: props.populationTotal,
                year: props.populationYear!,
              }
            : null,
          info: props.missing && props.missing.length > 0
            ? { missing: props.missing }
            : undefined,
        };
      })
      .filter((s): s is SubzoneListItem => s !== null);

    setSelectedSubzones(subzones);
  }, [selection.selected, selection.count, geojson]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selection.clear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection]);

  // Use quantiles from API (Part E)
  const breaks = quantiles?.breaks || [];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* ALWAYS VISIBLE: Page Title */}
      <header
        style={{
          padding: '16px 24px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🗺️ Singapore Hawker Opportunity Map
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: '#94a3b8',
          }}
        >
          If you can read this, the page rendered successfully. Check console if map doesn't load.
        </p>
      </header>

      {/* ALWAYS VISIBLE: Diagnostic Banner */}
      <DiagBanner apiBase={API_BASE} mapbox={MAPBOX_TOKEN} />

      {/* Data Status Panel */}
      <DataStatusPanel status={diagStatus} />

      {/* Main Content with Error Boundary */}
      <PageErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <div style={{ padding: 24 }}>
            {/* Loading State */}
            {geoState === 'loading' && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 48,
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    border: '4px solid rgba(6, 182, 212, 0.3)',
                    borderTop: '4px solid #06b6d4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px',
                  }}
                />
                <div style={{ fontSize: 18, marginBottom: 8 }}>Loading Map...</div>
                <div style={{ fontSize: 14 }}>Fetching subzone geometry and data...</div>
              </div>
            )}

            {/* Fallback Success State */}
            {geoState === 'fallback-ok' && (
              <div
                style={{
                  padding: 16,
                  marginBottom: 16,
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: 8,
                  color: '#fbbf24',
                  fontSize: 14,
                }}
              >
                ⚠️ Using fallback geometry from public/data/subzones.geojson.
                API endpoint /api/v1/geo/subzones is not available.
              </div>
            )}

            {/* Geometry Failed State */}
            {geoState === 'geo-failed' && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#f97316',
                  background: 'rgba(251, 146, 60, 0.1)',
                  border: '1px solid rgba(251, 146, 60, 0.3)',
                  borderRadius: 8,
                  margin: '24px auto',
                  maxWidth: 600,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                <h2 style={{ margin: '0 0 12px', color: '#f97316' }}>
                  Map Geometry Unavailable
                </h2>
                <p style={{ margin: '0 0 16px', color: '#94a3b8' }}>
                  Both /api/v1/geo/subzones and /public/data/subzones.geojson failed to load.
                  Map layer won't render, but the app is running.
                </p>
                <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>
                  <div>✓ Frontend: OK</div>
                  <div>✓ Page: Rendered</div>
                  <div>✗ Geometry: Failed</div>
                  <div style={{ marginTop: 8 }}>
                    Check: Backend running? CORS enabled? Network tab in DevTools?
                  </div>
                </div>
              </div>
            )}

            {/* Map Successfully Loaded */}
            {(geoState === 'ok' || geoState === 'fallback-ok') && geojson && (
              <div style={{ position: 'relative', minHeight: 'calc(100vh - 200px)' }}>
                <MapContainer
                  geojson={geojson}
                  selectedIds={selection.selected}
                  hoverId={hover.hoverId}
                  onFeatureClick={selection.toggle}
                  onFeatureHover={hover.onEnter}
                />

                <MapLegend breaks={breaks} />

                {selection.count > 0 && (
                  <>
                    <ClearAllButton onClick={selection.clear} disabled={selection.count === 0} />
                    <SelectionTray
                      selectedSubzones={selectedSubzones}
                      onRemove={selection.remove}
                      maxSelections={2}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </Suspense>
      </PageErrorBoundary>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
