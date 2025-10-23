/**
 * DetailsPanel Component
 * Shows detailed information for a single selected subzone
 */

import React from 'react';
import type { SubzoneDetail } from '@/services/subzones';
import { formatPopulation } from '@/utils/geojson/colorScales';

interface DetailsPanelProps {
  subzone: SubzoneDetail;
}

export function DetailsPanel({ subzone }: DetailsPanelProps) {
  const hasPopulation = subzone.population !== null;
  const hasMissingData = subzone.info?.missing && subzone.info.missing.length > 0;

  return (
    <div className="details-panel">
      <h2 className="details-panel-title">{subzone.name}</h2>
      <div className="details-panel-region">{subzone.region}</div>

      <div className="details-panel-section">
        <div className="details-panel-section-title">Demographics</div>
        <div className="details-panel-row">
          <span className="details-panel-label">Population</span>
          <span className="details-panel-value">
            {hasPopulation
              ? formatPopulation(subzone.population!.total)
              : '—'}
          </span>
        </div>
        {hasPopulation && (
          <div className="details-panel-row">
            <span className="details-panel-label">Year</span>
            <span className="details-panel-value">{subzone.population!.year}</span>
          </div>
        )}
      </div>

      {subzone.metrics && (
        <div className="details-panel-section">
          <div className="details-panel-section-title">Metrics (Coming Soon)</div>
          <div className="details-panel-row">
            <span className="details-panel-label">Demand Score</span>
            <span className="details-panel-value">
              {subzone.metrics.demand ?? '—'}
            </span>
          </div>
          <div className="details-panel-row">
            <span className="details-panel-label">Supply Score</span>
            <span className="details-panel-value">
              {subzone.metrics.supply ?? '—'}
            </span>
          </div>
          <div className="details-panel-row">
            <span className="details-panel-label">Accessibility</span>
            <span className="details-panel-value">
              {subzone.metrics.accessibility ?? '—'}
            </span>
          </div>
          <div className="details-panel-row">
            <span className="details-panel-label">Overall Score</span>
            <span className="details-panel-value">
              {subzone.metrics.score ?? '—'}
            </span>
          </div>
        </div>
      )}

      {hasMissingData && (
        <div className="details-panel-warning">
          <span className="details-panel-warning-icon">⚠️</span>
          <div className="details-panel-warning-text">
            {subzone.info!.missing!.includes('population') &&
              'Population data not found for this subzone. '}
            {subzone.info!.missing!.includes('metrics') &&
              'Metrics data will be available in future updates.'}
          </div>
        </div>
      )}
    </div>
  );
}

