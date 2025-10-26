/**
 * PerformancePanel Component
 * Task J: Dev-only performance controls for simplify and fields
 */

"use client";

import React from 'react';

interface PerformancePanelProps {
  simplify: number;
  includeExtraFields: boolean;
  onSimplifyChange: (value: number) => void;
  onExtraFieldsChange: (value: boolean) => void;
}

const SIMPLIFY_OPTIONS = [
  { value: 0, label: '0m (Full Detail)' },
  { value: 25, label: '25m' },
  { value: 50, label: '50m (Default)' },
  { value: 100, label: '100m' },
];

export function PerformancePanel({
  simplify,
  includeExtraFields,
  onSimplifyChange,
  onExtraFieldsChange,
}: PerformancePanelProps) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 8,
        padding: 16,
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        minWidth: 280,
      }}
    >
      <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#06b6d4', fontWeight: 600 }}>
        ⚡ Performance Controls
      </h4>

      {/* Simplify Tolerance */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          Simplify Tolerance
        </label>
        <select
          value={simplify}
          onChange={(e) => onSimplifyChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 6,
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {SIMPLIFY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {simplify === 0 ? 'All coordinates kept' : `Coordinates reduced by ~${simplify}m`}
        </div>
      </div>

      {/* Extra Fields Toggle */}
      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          Extra Fields (Transit Counts)
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={includeExtraFields}
            onChange={(e) => onExtraFieldsChange(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: includeExtraFields ? '#06b6d4' : '#64748b' }}>
            Include hawkerCount, mrtExitCount, busStopCount
          </span>
        </label>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {includeExtraFields
            ? 'Larger payload (~10% more data)'
            : 'Minimal data only'}
        </div>
      </div>
    </div>
  );
}

