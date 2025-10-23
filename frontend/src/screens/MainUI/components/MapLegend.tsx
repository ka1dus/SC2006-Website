/**
 * MapLegend Component
 * Displays color legend for population quantiles
 */

import React from 'react';
import { getLegendItems } from '@/utils/geojson/colorScales';

interface MapLegendProps {
  breaks: number[];
}

export function MapLegend({ breaks }: MapLegendProps) {
  const items = getLegendItems(breaks);

  return (
    <div className="map-legend">
      <div className="map-legend-title">Population</div>
      {items.map((item, index) => (
        <div key={index} className="map-legend-item">
          <div
            className="map-legend-color"
            style={{ backgroundColor: item.color }}
          />
          <div className="map-legend-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

