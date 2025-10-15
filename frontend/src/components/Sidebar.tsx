import React from 'react';
import { useMap } from '@/contexts/MapContext';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import FilterPanel from './FilterPanel';
import ComparisonTray from './ComparisonTray';
import SubzoneDetails from './SubzoneDetails';

export default function Sidebar() {
  const { selectedSubzone, comparisonSubzones } = useMap();

  return (
    <aside className="w-80 bg-white shadow-sm border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Filter Panel */}
        <FilterPanel />
        
        {/* Comparison Tray */}
        {comparisonSubzones.length > 0 && (
          <ComparisonTray />
        )}
        
        {/* Subzone Details */}
        {selectedSubzone && (
          <SubzoneDetails subzone={selectedSubzone} />
        )}
        
        {/* Empty State */}
        {!selectedSubzone && comparisonSubzones.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No subzone selected
            </h3>
            <p className="text-sm text-gray-500">
              Click on a subzone on the map to view details
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
