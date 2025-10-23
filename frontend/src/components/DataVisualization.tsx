import React from 'react';
import { useQuery } from 'react-query';
import { SubzoneAPI } from '@/services/subzones';
import { useMap } from '@/contexts/MapContext';
import LoadingSpinner from './LoadingSpinner';

export default function DataVisualization() {
  const { filters, setSelectedSubzone } = useMap();

  // Fetch subzones data
  const { data: subzones, isLoading, error } = useQuery(
    ['subzones', filters],
    () => SubzoneAPI.getAllSubzones(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500';
    if (score >= 0.6) return 'bg-cyan-500';
    if (score >= 0.4) return 'bg-blue-500';
    if (score >= 0.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-300';
    if (score >= 0.6) return 'text-cyan-300';
    if (score >= 0.4) return 'text-blue-300';
    if (score >= 0.2) return 'text-yellow-300';
    return 'text-red-300';
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-lg font-semibold text-gray-200 mb-2">
            Loading Data
          </p>
          <p className="text-sm text-gray-400">
            Analyzing hawker opportunity scores...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-300 mb-2">
            Failed to Load Data
          </h3>
          <p className="text-sm text-gray-400">
            {(error as any)?.message || 'Unable to fetch subzone data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2">
            Hawker Opportunity Analytics
          </h1>
          <p className="text-gray-400">
            Interactive data visualization of Singapore subzones and their hawker opportunity scores
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Subzones</p>
                <p className="text-2xl font-bold text-gray-200">{subzones?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <span className="text-xl">🏢</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Potential</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {subzones?.filter((s: any) => s.score?.H >= 0.7).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <span className="text-xl">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {subzones?.length ? (subzones.reduce((sum: number, s: any) => sum + (s.score?.H || 0), 0) / subzones.length * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Regions</p>
                <p className="text-2xl font-bold text-purple-400">
                  {new Set(subzones?.map((s: any) => s.region)).size || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <span className="text-xl">🗺️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subzones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subzones?.map((subzone: any) => (
            <div
              key={subzone.id}
              onClick={() => setSelectedSubzone(subzone)}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">
                  {subzone.name}
                </h3>
                <div className={`w-3 h-3 rounded-full ${getScoreColor(subzone.score?.H || 0)}`}></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Region</span>
                  <span className="text-sm font-medium text-blue-400">{subzone.region}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">ID</span>
                  <span className="text-sm font-mono text-gray-300">{subzone.subzoneId}</span>
                </div>

                {subzone.score && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Score</span>
                      <span className={`text-lg font-bold ${getScoreTextColor(subzone.score.H)}`}>
                        {(subzone.score.H * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Percentile</span>
                      <span className="text-sm font-medium text-gray-300">
                        Top {subzone.score.percentile.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-400">Demand</p>
                          <p className="font-medium text-green-400">
                            {(subzone.score.zDemand * 100).toFixed(0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Supply</p>
                          <p className="font-medium text-blue-400">
                            {(subzone.score.zSupply * 100).toFixed(0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Access</p>
                          <p className="font-medium text-purple-400">
                            {(subzone.score.zAccess * 100).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {subzones?.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-700/50 rounded-2xl flex items-center justify-center border border-slate-600/50">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              No Subzones Found
            </h3>
            <p className="text-sm text-gray-400">
              Try adjusting your filters to see more results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
