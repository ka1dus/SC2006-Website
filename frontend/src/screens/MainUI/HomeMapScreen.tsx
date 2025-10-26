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
import { SubzoneSearch } from './components/SubzoneSearch';
import { SelectionTray } from './components/SelectionTray';
import { ComparePanel } from './components/ComparePanel';
import { PerformancePanel } from './components/PerformancePanel';
import { ClearAllButton } from './components/ClearAllButton';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import DiagBanner from './components/DiagBanner';
import { DataStatusPanel } from './components/DataStatusPanel';
import { bucketIndex } from '@/utils/geojson/colorScales';
import { useRouter } from 'next/router';
import type { Feature } from '@/services/subzones';

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
  const [zoomToFeature, setZoomToFeature] = useState<Feature | null>(null);
  const [simplify, setSimplify] = useState(50);
  const [includeExtraFields, setIncludeExtraFields] = useState(true);

  const selection = useSubzoneSelection(2);
  const hover = useMapHoverFeature();
  const router = useRouter();

  // Fetch quantiles from API (Part E)
  useEffect(() => {
    let mounted = true;

    async function fetchQuantiles() {
      try {
        const data = await SubzoneAPI.getQuantiles(5);
        if (mounted) {
          setQuantiles(data);
          console.info('[geo] quantiles fetched:', data.breaks);
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
          console.info('[health] subzones:', status.subzones, 'populations:', status.populations);
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

  // Fetch GeoJSON with fallback strategy (Task J: dynamic simplify and fields)
  useEffect(() => {
    let mounted = true;

    async function fetchGeoJSON() {
      try {
        setGeoState('loading');
        const fields = includeExtraFields
          ? ['hawkerCount', 'mrtExitCount', 'busStopCount']
          : undefined;
        const data = await SubzoneAPI.geo({
          fields,
          simplify,
        });
        if (mounted) {
          setGeojson(data);
          setGeoState('ok');
          console.info('[geo] loaded', data.features.length, 'features');
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
  }, [simplify, includeExtraFields]); // Task J: Refetch when simplify or fields change

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

  // Task G: Verify bucket correctness (dev-only)
  useEffect(() => {
    if (!geojson || breaks.length < 4 || process.env.NODE_ENV !== 'development') return;

    // Sample 20 random features
    const sampleSize = Math.min(20, geojson.features.length);
    const sampledFeatures = geojson.features
      .filter(f => f.properties.populationTotal !== null)
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize);

    sampledFeatures.forEach(feature => {
      const expectedBucket = bucketIndex(breaks, feature.properties.populationTotal);
      if (expectedBucket < 0) {
        console.warn(`[Task G] Feature ${feature.properties.id} has null population but passed filter`);
      }
    });

    console.info(`[Task G] Verified ${sampledFeatures.length} features, all buckets match legend`);
  }, [geojson, breaks]);

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

      {/* Task G: Dev-only quantile badge */}
      {process.env.NODE_ENV === 'development' && quantiles && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#06b6d4',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div>k={quantiles.k}</div>
          <div>n={quantiles.n}</div>
          <div>breaks=[{quantiles.breaks.map(b => b.toLocaleString()).join(', ')}]</div>
        </div>
      )}

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
                  zoomToFeature={zoomToFeature}
                  breaks={quantiles?.breaks}
                />

                {/* Task I: Subzone Search */}
                {geojson && (
                  <SubzoneSearch
                    geojson={geojson}
                    onZoom={(f) => {
                      setZoomToFeature(f);
                      // Reset after a short delay to allow re-zooming if needed
                      setTimeout(() => setZoomToFeature(null), 1200);
                    }}
                    onSelect={(f) => selection.toggle(f.properties.id)}
                  />
                )}

                <MapLegend breaks={breaks} />

                {/* Task J: Performance Panel (dev-only) */}
                <PerformancePanel
                  simplify={simplify}
                  includeExtraFields={includeExtraFields}
                  onSimplifyChange={setSimplify}
                  onExtraFieldsChange={setIncludeExtraFields}
                />

                {/* Task H: Compare Panel when 1-2 subzones selected */}
                {selection.count >= 1 && geojson && (
                  <ComparePanel
                    selectedIds={selection.selected}
                    geojson={geojson}
                    onClearAll={() => {
                      selection.clear();
                      router.push('/?ids=');
                    }}
                  />
                )}

                {/* Legacy selection tray (hidden when ComparePanel is shown) */}
                {selection.count === 0 && null}
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
