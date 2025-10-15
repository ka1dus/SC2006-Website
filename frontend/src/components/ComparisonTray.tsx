import React from 'react';
import { useMap } from '@/contexts/MapContext';
import { XIcon, BarChart3Icon, TrashIcon } from 'lucide-react';
import Link from 'next/link';

interface Subzone {
  id: string;
  subzoneId: string;
  name: string;
  region: string;
  score?: {
    H: number;
    percentile: number;
  };
}

export default function ComparisonTray() {
  const { comparisonSubzones, removeFromComparison, clearComparison } = useMap();

  const handleRemove = (subzoneId: string) => {
    removeFromComparison(subzoneId);
  };

  const handleCompare = () => {
    // Navigate to comparison page
    window.open(`/compare?subzones=${comparisonSubzones.map(s => s.subzoneId).join(',')}`, '_blank');
  };

  if (comparisonSubzones.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BarChart3Icon className="h-5 w-5 mr-2" />
            Comparison Tray
          </h3>
          <div className="flex items-center space-x-2">
            {comparisonSubzones.length === 2 && (
              <button
                onClick={handleCompare}
                className="btn-primary text-sm px-3 py-1"
              >
                Compare
              </button>
            )}
            <button
              onClick={clearComparison}
              className="text-gray-400 hover:text-gray-600"
              title="Clear all"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body">
        <div className="space-y-3">
          {comparisonSubzones.map((subzone) => (
            <div
              key={subzone.subzoneId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  {subzone.name}
                </h4>
                <p className="text-xs text-gray-500">{subzone.region}</p>
                {subzone.score && (
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-xs text-gray-600">
                      Score: {subzone.score.H.toFixed(3)}
                    </span>
                    <span className="text-xs text-gray-600">
                      Top {subzone.score.percentile.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleRemove(subzone.subzoneId)}
                className="text-gray-400 hover:text-red-600 ml-2"
                title="Remove from comparison"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        {comparisonSubzones.length < 2 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Add {2 - comparisonSubzones.length} more subzone{2 - comparisonSubzones.length === 1 ? '' : 's'} to compare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
