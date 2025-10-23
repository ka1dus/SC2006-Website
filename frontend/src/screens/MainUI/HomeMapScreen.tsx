/**
 * HomeMapScreen Component
 * Main map experience with subzone visualization and selection
 */

import React, { useEffect, useState } from 'react';
import { SubzoneAPI, type FeatureCollection, type SubzoneListItem } from '@/services/subzones';
import { APIError } from '@/services/api';
import { useSubzoneSelection } from '@/utils/hooks/useSubzoneSelection';
import { useMapHoverFeature } from '@/utils/hooks/useMapHoverFeature';
import { MapContainer } from './components/MapContainer';
import { MapLegend } from './components/MapLegend';
import { SelectionTray } from './components/SelectionTray';
import { ClearAllButton } from './components/ClearAllButton';
import { computeQuantiles } from '@/utils/geojson/colorScales';

export function HomeMapScreen() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubzones, setSelectedSubzones] = useState<SubzoneListItem[]>([]);

  const selection = useSubzoneSelection(2);
  const hover = useMapHoverFeature();

  // Fetch GeoJSON on mount
  useEffect(() => {
    async function fetchGeoJSON() {
      try {
        setLoading(true);
        const data = await SubzoneAPI.geo();
        setGeojson(data);
        setError(null);
      } catch (err) {
        if (err instanceof APIError && err.status === 503) {
          setError('GEODATA_UNAVAILABLE');
        } else {
          setError('FETCH_ERROR');
        }
        console.error('Failed to fetch GeoJSON:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGeoJSON();
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

  if (loading) {
    return (
      <div className="map-error">
        <div className="loading-skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
        <div className="map-error-title">Loading Map...</div>
        <div className="map-error-message">
          Please wait while we load the subzone data
        </div>
      </div>
    );
  }

  if (error === 'GEODATA_UNAVAILABLE') {
    return (
      <div className="map-error">
        <div className="map-error-icon">🗺️</div>
        <div className="map-error-title">Map Geometry Unavailable</div>
        <div className="map-error-message">
          The map polygons are temporarily unavailable. You can still search and
          compare subzones by name in the next version.
        </div>
      </div>
    );
  }

  if (error || !geojson) {
    return (
      <div className="map-error">
        <div className="map-error-icon">❌</div>
        <div className="map-error-title">Failed to Load Map</div>
        <div className="map-error-message">
          There was an error loading the map data. Please refresh the page to try
          again.
        </div>
      </div>
    );
  }

  const breaks = computeQuantiles(geojson.features);

  return (
    <div style={{ position: 'relative' }}>
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
  );
}

