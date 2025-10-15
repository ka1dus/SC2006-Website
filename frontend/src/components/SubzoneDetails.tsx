import React from 'react';

interface Subzone {
  id: string;
  subzoneId: string;
  name: string;
  region: string;
  geometryPolygon: any;
  centroid: any;
  radii: number[];
  score?: {
    H: number;
    percentile: number;
    zDemand: number;
    zSupply: number;
    zAccess: number;
  };
}

interface SubzoneDetailsProps {
  subzone: Subzone;
}

export default function SubzoneDetails({ subzone }: SubzoneDetailsProps) {
  const score = subzone.score;
  const percentile = score?.percentile || 0;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.6) return 'text-cyan-400';
    if (score >= 0.4) return 'text-blue-400';
    if (score >= 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 0.6) return 'bg-cyan-500/20 border-cyan-500/30';
    if (score >= 0.4) return 'bg-blue-500/20 border-blue-500/30';
    if (score >= 0.2) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getPercentileText = (percentile: number) => {
    if (percentile >= 90) return 'Exceptional';
    if (percentile >= 75) return 'High';
    if (percentile >= 50) return 'Moderate';
    if (percentile >= 25) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-200 mb-2">
          {subzone.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Region:</span>
          <span className="text-sm font-medium text-blue-400">{subzone.region}</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-sm text-gray-400">ID:</span>
          <span className="text-sm font-mono text-gray-300">{subzone.subzoneId}</span>
        </div>
      </div>

      {score ? (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className={`p-4 rounded-xl border ${getScoreBgColor(score.H)}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-gray-200">Overall Score</h4>
              <span className={`text-2xl font-bold ${getScoreColor(score.H)}`}>
                {(score.H * 100).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Percentile Rank</span>
              <span className="text-sm font-medium text-gray-300">
                Top {percentile.toFixed(1)}% - {getPercentileText(percentile)}
              </span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <h4 className="text-lg font-semibold text-gray-200 mb-4">Score Breakdown</h4>
            <div className="space-y-3">
              {/* Demand Score */}
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center border border-green-500/30">
                    <span className="text-sm">📈</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Demand</p>
                    <p className="text-xs text-gray-400">Population density & activity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getScoreColor(score.zDemand)}`}>
                    {(score.zDemand * 100).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Z-Score</p>
                </div>
              </div>

              {/* Supply Score */}
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <span className="text-sm">🏪</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Supply</p>
                    <p className="text-xs text-gray-400">Existing hawker centers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getScoreColor(score.zSupply)}`}>
                    {(score.zSupply * 100).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Z-Score</p>
                </div>
              </div>

              {/* Accessibility Score */}
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <span className="text-sm">🚇</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Accessibility</p>
                    <p className="text-xs text-gray-400">Transport connectivity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getScoreColor(score.zAccess)}`}>
                    {(score.zAccess * 100).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Z-Score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Summary */}
          <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-600/30">
            <h4 className="text-lg font-semibold text-gray-200 mb-3">Analysis Summary</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                This subzone shows <span className="font-medium text-cyan-400">{getPercentileText(percentile)}</span> hawker opportunity potential.
              </p>
              <p>
                The area ranks in the <span className="font-medium text-blue-400">top {percentile.toFixed(1)}%</span> of all analyzed subzones.
              </p>
              {score.H >= 0.7 && (
                <p className="text-emerald-400 font-medium">
                  💡 High potential for new hawker center development
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-2xl flex items-center justify-center border border-slate-600/50">
            <span className="text-2xl">📊</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-200 mb-2">
            No Score Data
          </h4>
          <p className="text-sm text-gray-400">
            Score analysis not available for this subzone
          </p>
        </div>
      )}
    </div>
  );
}