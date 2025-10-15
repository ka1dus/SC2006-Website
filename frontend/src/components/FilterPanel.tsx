import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import { useMap } from '@/contexts/MapContext';
import { 
  FilterIcon, 
  SearchIcon, 
  XIcon,
  ChevronDownIcon 
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function FilterPanel() {
  const { filters, setFilters, clearFilters } = useMap();
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <XIcon className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="card-body space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Subzones
          </label>
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter subzone name..."
              className="flex-1 input rounded-r-none"
            />
            <button
              onClick={handleSearch}
              className="btn-primary rounded-l-none px-3"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <div className="relative">
            <select
              value={filters.region || 'all'}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="input w-full appearance-none pr-8"
            >
              <option value="all">All Regions</option>
              {regionsLoading ? (
                <option disabled>Loading...</option>
              ) : (
                regions?.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Percentile Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Score Percentile
          </label>
          <div className="relative">
            <select
              value={filters.percentile?.toString() || 'all'}
              onChange={(e) => handlePercentileChange(e.target.value)}
              className="input w-full appearance-none pr-8"
            >
              <option value="all">All Scores</option>
              <option value="10">Top 10%</option>
              <option value="25">Top 25%</option>
              <option value="50">Top 50%</option>
              <option value="75">Top 75%</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
            <div className="space-y-1">
              {filters.region && (
                <div className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                  <span>Region: {filters.region}</span>
                  <button
                    onClick={() => setFilters({ region: undefined })}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filters.percentile && (
                <div className="flex items-center justify-between text-xs bg-green-50 px-2 py-1 rounded">
                  <span>Top {filters.percentile}%</span>
                  <button
                    onClick={() => setFilters({ percentile: undefined })}
                    className="text-green-600 hover:text-green-800"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filters.search && (
                <div className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
                  <span>Search: {filters.search}</span>
                  <button
                    onClick={() => {
                      setFilters({ search: undefined });
                      setSearchQuery('');
                    }}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
