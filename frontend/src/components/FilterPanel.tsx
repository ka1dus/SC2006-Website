import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import { useMap } from '@/contexts/MapContext';
import LoadingSpinner from './LoadingSpinner';

export default function FilterPanel() {
  const { filters, setFilters, clearFilters } = useMap();
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  // Fetch regions
  const { data: regions, isLoading: regionsLoading } = useQuery(
    'regions',
    subzoneService.getAllRegions,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const handleRegionChange = (region: string) => {
    setFilters({ region: region === 'all' ? undefined : region });
  };

  const handlePercentileChange = (percentile: string) => {
    const value = percentile === 'all' ? undefined : parseFloat(percentile);
    setFilters({ percentile: value });
  };

  const handleSearch = () => {
    setFilters({ search: searchQuery || undefined });
  };

  const handleClearFilters = () => {
    clearFilters();
    setSearchQuery('');
  };

  const hasActiveFilters = filters.region || filters.percentile || filters.search;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-lg flex items-center justify-center shadow-glow">
            <span className="text-lg">🔍</span>
          </div>
          <h3 className="text-xl font-bold text-dark-100">
            Smart Filters
          </h3>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="group relative px-4 py-2 rounded-lg text-sm font-semibold text-dark-400 hover:text-neon-pink hover:bg-red-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span className="text-lg group-hover:animate-spin">❌</span>
              <span>Clear All</span>
            </span>
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* Search */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-dark-200 uppercase tracking-wider">
            Search Subzones
          </label>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex">
              <input
                type="text"
                placeholder="Enter subzone name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-6 py-4 bg-dark-700/50 border border-dark-600/50 rounded-l-xl text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 transition-all duration-300 backdrop-blur-sm"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-4 bg-gradient-to-r from-neon-cyan to-neon-blue text-dark-900 rounded-r-xl hover:from-neon-cyan/80 hover:to-neon-blue/80 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 transition-all duration-300 shadow-glow hover:shadow-glow-lg font-semibold"
              >
                🔍
              </button>
            </div>
          </div>
        </div>

        {/* Region Filter */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-dark-200 uppercase tracking-wider">
            Region
          </label>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <select
                value={filters.region || 'all'}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full px-6 py-4 bg-dark-700/50 border border-dark-600/50 rounded-xl text-dark-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all duration-300 appearance-none backdrop-blur-sm"
              >
                <option value="all">All Regions</option>
                {regionsLoading ? (
                  <option disabled>Loading...</option>
                ) : (
                  regions?.map((region: string) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-400 pointer-events-none">
                <span className="text-lg">▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Percentile Filter */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-dark-200 uppercase tracking-wider">
            Score Percentile
          </label>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <select
                value={filters.percentile?.toString() || 'all'}
                onChange={(e) => handlePercentileChange(e.target.value)}
                className="w-full px-6 py-4 bg-dark-700/50 border border-dark-600/50 rounded-xl text-dark-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple/50 transition-all duration-300 appearance-none backdrop-blur-sm"
              >
                <option value="all">All Scores</option>
                <option value="10">Top 10%</option>
                <option value="25">Top 25%</option>
                <option value="50">Top 50%</option>
                <option value="75">Top 75%</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-400 pointer-events-none">
                <span className="text-lg">▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-6 border-t border-dark-700/50">
            <h4 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wider">Active Filters:</h4>
            <div className="flex flex-wrap gap-3">
              {filters.region && (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-neon-blue/20 text-neon-blue border border-neon-blue/30 backdrop-blur-sm">
                  Region: {filters.region}
                  <button
                    onClick={() => setFilters({ region: undefined })}
                    className="ml-2 hover:text-neon-blue/80 transition-colors"
                  >
                    ❌
                  </button>
                </span>
              )}
              {filters.percentile && (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-neon-green/20 text-neon-green border border-neon-green/30 backdrop-blur-sm">
                  Top {filters.percentile}%
                  <button
                    onClick={() => setFilters({ percentile: undefined })}
                    className="ml-2 hover:text-neon-green/80 transition-colors"
                  >
                    ❌
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-neon-purple/20 text-neon-purple border border-neon-purple/30 backdrop-blur-sm">
                  Search: {filters.search}
                  <button
                    onClick={() => setFilters({ search: undefined })}
                    className="ml-2 hover:text-neon-purple/80 transition-colors"
                  >
                    ❌
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}