/**
 * DataStatusPanel Component
 * Displays system diagnostics (DB counts, GeoJSON status)
 * Task DIAG-ENDTOEND
 */

"use client";

import React from 'react';
import type { DiagStatus } from '../HomeMapScreen';

interface DataStatusPanelProps {
  status: DiagStatus | null;
}

export function DataStatusPanel({ status }: DataStatusPanelProps) {
  if (!status) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: 8,
          fontSize: 12,
          color: '#94a3b8',
          zIndex: 20,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>📊 Data Status</div>
        <div>Loading...</div>
      </div>
    );
  }

  const geoStatusColor = status.geo.ok ? '#10b981' : '#f59e0b';
  const geoStatusIcon = status.geo.ok ? '✅' : '⚠️';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 8,
        fontSize: 12,
        color: '#e2e8f0',
        zIndex: 20,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 8,
          color: '#06b6d4',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        📊 Data Status
      </div>
      
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#94a3b8' }}>Subzones:</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{status.subzones}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#94a3b8' }}>Populations:</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{status.populations}</span>
        </div>
        
        {status.unmatched > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#fbbf24' }}>Unmatched:</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#fbbf24' }}>
              {status.unmatched}
            </span>
          </div>
        )}
        
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(100, 116, 139, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>GeoJSON:</span>
            <span style={{ fontWeight: 600, color: geoStatusColor }}>
              {geoStatusIcon} {status.geo.ok ? 'OK' : 'Failed'}
            </span>
          </div>
          
          {status.geo.ok && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Features:</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                {status.geo.features}
              </span>
            </div>
          )}
          
          {status.geo.error && (
            <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>
              {status.geo.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

