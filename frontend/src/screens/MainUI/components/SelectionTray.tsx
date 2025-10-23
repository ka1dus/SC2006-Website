/**
 * SelectionTray Component
 * Shows selected subzones and Compare button
 */

import React from 'react';
import { useRouter } from 'next/router';
import type { SubzoneListItem } from '@/services/subzones';
import { formatPopulation } from '@/utils/geojson/colorScales';

interface SelectionTrayProps {
  selectedSubzones: SubzoneListItem[];
  onRemove: (id: string) => void;
  maxSelections?: number;
}

export function SelectionTray({
  selectedSubzones,
  onRemove,
  maxSelections = 2,
}: SelectionTrayProps) {
  const router = useRouter();

  const handleCompare = () => {
    const ids = selectedSubzones.map((s) => s.id).join(',');
    router.push(`/compare?ids=${ids}`);
  };

  const canCompare = selectedSubzones.length >= 2;

  return (
    <div className="selection-tray">
      <div className="selection-tray-title">
        Selected
        <span className="selection-tray-count">
          {selectedSubzones.length}/{maxSelections}
        </span>
      </div>

      {selectedSubzones.length === 0 ? (
        <div className="selection-tray-empty">
          Click on the map to select subzones for comparison
        </div>
      ) : (
        <>
          <div className="selection-tray-items">
            {selectedSubzones.map((subzone) => (
              <div key={subzone.id} className="selection-tray-item">
                <div className="selection-tray-item-info">
                  <div className="selection-tray-item-name">{subzone.name}</div>
                  <div className="selection-tray-item-population">
                    {subzone.population
                      ? `Pop: ${formatPopulation(subzone.population.total)}`
                      : 'Population: —'}
                  </div>
                </div>
                <button
                  className="selection-tray-item-remove"
                  onClick={() => onRemove(subzone.id)}
                  aria-label={`Remove ${subzone.name}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            className="selection-tray-compare-btn"
            onClick={handleCompare}
            disabled={!canCompare}
          >
            {canCompare
              ? `Compare ${selectedSubzones.length} Subzones`
              : `Select ${2 - selectedSubzones.length} more to compare`}
          </button>
        </>
      )}
    </div>
  );
}

