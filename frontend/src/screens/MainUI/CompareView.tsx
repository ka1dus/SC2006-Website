/**
 * CompareView Component
 * Side-by-side comparison of two selected subzones
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SubzoneAPI, type SubzoneDetail } from '@/services/subzones';
import { formatPopulation } from '@/utils/geojson/colorScales';

export function CompareView() {
  const router = useRouter();
  const { ids } = router.query;

  const [subzones, setSubzones] = useState<SubzoneDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids || typeof ids !== 'string') {
      setError('NO_IDS');
      setLoading(false);
      return;
    }

    const idArray = ids.split(',').filter(Boolean);
    if (idArray.length < 2) {
      setError('INSUFFICIENT_IDS');
      setLoading(false);
      return;
    }

    async function fetchSubzones() {
      try {
        setLoading(true);
        const data = await SubzoneAPI.batch(idArray);
        setSubzones(data);
        setError(null);
      } catch (err) {
        setError('FETCH_ERROR');
        console.error('Failed to fetch subzones for comparison:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubzones();
  }, [ids]);

  const handleBackToMap = () => {
    // Preserve selection in URL
    router.push(`/?ids=${ids}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBackToMap}
            className="mb-6 px-4 py-2 bg-dark-800 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-dark-700 transition-colors"
          >
            ← Back to Map
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="loading-skeleton"
                style={{ height: 400, borderRadius: 16 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || subzones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-slate-200 mb-4">
            Unable to Compare Subzones
          </h1>
          <p className="text-slate-400 mb-6">
            {error === 'NO_IDS' && 'No subzones selected for comparison.'}
            {error === 'INSUFFICIENT_IDS' && 'Please select at least 2 subzones to compare.'}
            {error === 'FETCH_ERROR' && 'Failed to load subzone data.'}
            {!error && 'No subzone data available.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-blue text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-neon-cyan/50 transition-all"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleBackToMap}
          className="mb-6 px-4 py-2 bg-dark-800 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          ← Back to Map
        </button>

        <h1 className="text-3xl font-bold text-slate-200 mb-8">
          Subzone Comparison
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subzones.slice(0, 2).map((subzone) => {
            const hasPopulation = subzone.population !== null;
            const hasMissingData =
              subzone.info?.missing && subzone.info.missing.length > 0;

            return (
              <div
                key={subzone.id}
                className="bg-dark-800/50 backdrop-blur-lg border border-neon-cyan/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-neon-cyan mb-2">
                  {subzone.name}
                </h2>
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-6">
                  {subzone.region}
                </p>

                {/* Demographics */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Demographics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                      <span className="text-slate-400">Population</span>
                      <span
                        className="font-semibold text-slate-200"
                        title={!hasPopulation ? 'Data not found' : ''}
                      >
                        {hasPopulation
                          ? formatPopulation(subzone.population!.total)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                      <span className="text-slate-400">Year</span>
                      <span className="font-semibold text-slate-200">
                        {hasPopulation ? subzone.population!.year : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                {subzone.metrics && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                      Metrics (Coming Soon)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400">Demand Score</span>
                        <span className="font-semibold text-slate-200">
                          {subzone.metrics.demand ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400">Supply Score</span>
                        <span className="font-semibold text-slate-200">
                          {subzone.metrics.supply ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400">Accessibility</span>
                        <span className="font-semibold text-slate-200">
                          {subzone.metrics.accessibility ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-400">Overall Score</span>
                        <span className="font-semibold text-neon-cyan">
                          {subzone.metrics.score ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning for missing data */}
                {hasMissingData && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                    <span className="text-yellow-500 text-lg flex-shrink-0">⚠️</span>
                    <div className="text-yellow-200 text-sm">
                      {subzone.info!.missing!.includes('population') &&
                        'Population data not found. '}
                      {subzone.info!.missing!.includes('metrics') &&
                        'Metrics will be available in future updates.'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

