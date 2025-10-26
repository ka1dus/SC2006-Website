/**
 * SubzoneSearch Component
 * Task I: Search box & keyboard navigation
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FeatureCollection, Feature } from '@/services/subzones';

interface SubzoneSearchProps {
  geojson: FeatureCollection;
  onSelect?: (feature: Feature) => void;
  onZoom?: (feature: Feature) => void;
}

export function SubzoneSearch({ geojson, onSelect, onZoom }: SubzoneSearchProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Feature[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() === '') {
        setMatches([]);
        setIsOpen(false);
        setHighlightIndex(-1);
        return;
      }

      const searchTerm = query.trim().toLowerCase();
      const filtered = geojson.features.filter((f) =>
        f.properties.name.toLowerCase().includes(searchTerm)
      );

      setMatches(filtered.slice(0, 10)); // Limit to top 10
      setIsOpen(filtered.length > 0);
      setHighlightIndex(filtered.length > 0 ? 0 : -1);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, geojson]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || matches.length === 0) {
        if (e.key === 'Escape') {
          setQuery('');
          setIsOpen(false);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) => Math.min(prev + 1, matches.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < matches.length) {
            const feature = matches[highlightIndex];
            setQuery(feature.properties.name);
            setIsOpen(false);
            onSelect?.(feature);
            onZoom?.(feature);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setQuery('');
          setIsOpen(false);
          setHighlightIndex(-1);
          searchRef.current?.blur();
          break;
      }
    },
    [isOpen, matches, highlightIndex, onSelect, onZoom]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && resultsRef.current) {
      const highlightedItem = resultsRef.current.children[highlightIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightIndex]);

  const handleMatchClick = (feature: Feature) => {
    setQuery(feature.properties.name);
    setIsOpen(false);
    onSelect?.(feature);
    onZoom?.(feature);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 16,
        zIndex: 10,
        width: 320,
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search subzones..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => matches.length > 0 && setIsOpen(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            backdropFilter: 'blur(12px)',
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              searchRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && matches.length > 0 && (
        <div
          ref={resultsRef}
          style={{
            marginTop: 8,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 8,
            maxHeight: 300,
            overflowY: 'auto',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {matches.map((feature, index) => (
            <div
              key={feature.properties.id}
              onClick={() => handleMatchClick(feature)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < matches.length - 1 ? '1px solid rgba(6, 182, 212, 0.1)' : 'none',
                background:
                  highlightIndex === index
                    ? 'rgba(6, 182, 212, 0.2)'
                    : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 4 }}>
                {feature.properties.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {feature.properties.region}
                {feature.properties.populationTotal !== null && (
                  <span style={{ marginLeft: 8 }}>
                    {feature.properties.populationTotal.toLocaleString()} pop.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {query && !isOpen && matches.length === 0 && (
        <div
          style={{
            marginTop: 8,
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#ef4444',
            fontSize: 14,
            backdropFilter: 'blur(12px)',
          }}
        >
          No matches found for "{query}"
        </div>
      )}
    </div>
  );
}

