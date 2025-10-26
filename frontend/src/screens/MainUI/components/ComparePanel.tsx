/**
 * ComparePanel Component
 * Task H: Side-by-side comparison with scoring + Clear All
 */

"use client";

import React, { useState, useEffect } from 'react';
import type { FeatureCollection } from '@/services/subzones';
import { formatPopulation } from '@/utils/geojson/colorScales';

interface ComparePanelProps {
  selectedIds: string[];
  geojson: FeatureCollection;
  onClearAll: () => void;
}

interface SubzoneWithMetrics {
  id: string;
  name: string;
  region: string;
  populationTotal: number | null;
  hawkerCount: number;
  mrtExitCount: number;
  busStopCount: number;
  score: number;
}

interface Metrics {
  populationTotal: number[];
  hawkerCount: number[];
  mrtExitCount: number[];
  busStopCount: number[];
}

/**
 * Calculate z-score for normalization
 */
function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Calculate mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  return { mean, std };
}

/**
 * Calculate score from z-scores using weights
 */
function calculateScore(
  populationZ: number,
  mrtZ: number,
  hawkerZ: number,
  popWeight: number,
  mrtWeight: number,
  hawkerWeight: number
): number {
  // Higher population = better, more MRT = better, more hawkers = worse (reduces opportunity)
  const score = (populationZ * popWeight + mrtZ * mrtWeight - hawkerZ * hawkerWeight) * 20 + 50;
  return Math.max(0, Math.min(100, score)); // Clamp to 0-100
}

export function ComparePanel({ selectedIds, geojson, onClearAll }: ComparePanelProps) {
  const [weights, setWeights] = useState({ pop: 0.5, mrt: 0.3, hawker: 0.2 });
  const [showWeights, setShowWeights] = useState(false);

  // Extract metrics for selected subzones
  const selectedFeatures = geojson.features.filter((f) =>
    selectedIds.includes(f.properties.id)
  );

  // Calculate global statistics for normalization
  const metrics: Metrics = {
    populationTotal: geojson.features
      .map((f) => f.properties.populationTotal)
      .filter((v): v is number => v !== null),
    hawkerCount: geojson.features.map((f) => f.properties.hawkerCount || 0),
    mrtExitCount: geojson.features.map((f) => f.properties.mrtExitCount || 0),
    busStopCount: geojson.features.map((f) => f.properties.busStopCount || 0),
  };

  const popStats = calculateStats(metrics.populationTotal);
  const hawkerStats = calculateStats(metrics.hawkerCount);
  const mrtStats = calculateStats(metrics.mrtExitCount);

  const subzonesWithMetrics: SubzoneWithMetrics[] = selectedFeatures.map((f) => {
    const props = f.properties;
    const popTotal = props.populationTotal || 0;
    const hawkerCount = props.hawkerCount || 0;
    const mrtCount = props.mrtExitCount || 0;

    const popZ = zScore(popTotal, popStats.mean, popStats.std);
    const mrtZ = zScore(mrtCount, mrtStats.mean, mrtStats.std);
    const hawkerZ = zScore(hawkerCount, hawkerStats.mean, hawkerStats.std);

    const score = calculateScore(popZ, mrtZ, hawkerZ, weights.pop, weights.mrt, weights.hawker);

    return {
      id: props.id,
      name: props.name,
      region: props.region,
      populationTotal: props.populationTotal,
      hawkerCount,
      mrtExitCount: mrtCount,
      busStopCount: props.busStopCount || 0,
      score,
    };
  });

  // Normalize bar values for display
  const maxPopulation = Math.max(...metrics.populationTotal, 1);
  const maxHawker = Math.max(...metrics.hawkerCount, 1);
  const maxMrt = Math.max(...metrics.mrtExitCount, 1);
  const maxBus = Math.max(...metrics.busStopCount, 1);

  const getBarWidth = (value: number, max: number): string => {
    return `${Math.min(100, (value / max) * 100)}%`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#3b82f6'; // Blue
    if (score >= 40) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 1200,
        margin: '0 auto',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 12,
        padding: 24,
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#06b6d4' }}>
          📊 Comparison
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowWeights(!showWeights)}
            style={{
              padding: '6px 12px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 6,
              color: '#06b6d4',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {showWeights ? 'Hide' : 'Tweak'} Weights
          </button>
          <button
            onClick={onClearAll}
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#ef4444',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕ Clear All
          </button>
        </div>
      </div>

      {/* Weight Editor */}
      {showWeights && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 8,
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#06b6d4' }}>Scoring Weights</h4>
          {[
            { key: 'pop' as const, label: 'Population', value: weights.pop, max: 0.7 },
            { key: 'mrt' as const, label: 'MRT Accessibility', value: weights.mrt, max: 0.5 },
            { key: 'hawker' as const, label: 'Hawker Competition', value: weights.hawker, max: 0.4 },
          ].map(({ key, label, value, max }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                {label}: {value.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max={max}
                step="0.05"
                value={value}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  setWeights({ ...weights, [key]: newValue });
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Subzone Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedIds.length}, 1fr)`, gap: 20 }}>
        {subzonesWithMetrics.map((subzone) => (
          <div
            key={subzone.id}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            {/* Name + Region */}
            <h4 style={{ margin: '0 0 8px', fontSize: 16, color: '#fff' }}>
              {subzone.name}
            </h4>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              {subzone.region}
            </div>

            {/* Score */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Opportunity Score</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: getScoreColor(subzone.score),
                  }}
                >
                  {subzone.score.toFixed(0)}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'rgba(6, 182, 212, 0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${subzone.score}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${getScoreColor(subzone.score)}, ${getScoreColor(subzone.score)}cc)`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Population */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Population</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {formatPopulation(subzone.populationTotal)}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(6, 182, 212, 0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: getBarWidth(subzone.populationTotal || 0, maxPopulation),
                      height: '100%',
                      background: '#06b6d4',
                    }}
                  />
                </div>
              </div>

              {/* MRT Exits */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>MRT Exits</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {subzone.mrtExitCount}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: getBarWidth(subzone.mrtExitCount, maxMrt),
                      height: '100%',
                      background: '#22c55e',
                    }}
                  />
                </div>
              </div>

              {/* Hawker Centres */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Hawker Centres</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {subzone.hawkerCount}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: getBarWidth(subzone.hawkerCount, maxHawker),
                      height: '100%',
                      background: '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Bus Stops */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Bus Stops</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {subzone.busStopCount}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(147, 197, 253, 0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: getBarWidth(subzone.busStopCount, maxBus),
                      height: '100%',
                      background: '#93c5fd',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

