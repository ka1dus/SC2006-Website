import React from 'react';
import { useMap } from '@/contexts/MapContext';

export default function ComparisonTray() {
  const { comparisonSubzones, removeFromComparison, clearComparison } = useMap();

  if (comparisonSubzones.length === 0) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center">
          <span className="text-xl mr-2">⚖️</span>
          Comparison
        </h3>
        <button
          onClick={clearComparison}
          className="text-sm text-gray-400 hover:text-red-400 flex items-center px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all duration-300"
        >
          <span className="mr-1">❌</span>
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {comparisonSubzones.map((subzone, index) => (
          <div key={subzone.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-200">{subzone.name}</h4>
              <button
                onClick={() => removeFromComparison(subzone.subzoneId)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                ❌
              </button>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{subzone.region}</span>
              {subzone.score && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Score:</span>
                  <span className="font-medium text-cyan-400">
                    {(subzone.score.H * 100).toFixed(1)}
                  </span>
                  <span className="text-gray-400">
                    (Top {subzone.score.percentile.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {comparisonSubzones.length === 2 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-600/30">
          <h4 className="text-lg font-semibold text-gray-200 mb-3">Comparison Analysis</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              Comparing <span className="font-medium text-blue-400">{comparisonSubzones[0].name}</span> and{' '}
              <span className="font-medium text-purple-400">{comparisonSubzones[1].name}</span>
            </p>
            {comparisonSubzones[0].score && comparisonSubzones[1].score && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <span>Score Difference:</span>
                  <span className="font-medium text-cyan-400">
                    {Math.abs(comparisonSubzones[0].score.H - comparisonSubzones[1].score.H).toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Percentile Difference:</span>
                  <span className="font-medium text-blue-400">
                    {Math.abs(comparisonSubzones[0].score.percentile - comparisonSubzones[1].score.percentile).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}