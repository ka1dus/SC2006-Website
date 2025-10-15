import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface MapContextType {
  selectedSubzone: Subzone | null;
  setSelectedSubzone: (subzone: Subzone | null) => void;
  comparisonSubzones: Subzone[];
  addToComparison: (subzone: Subzone) => void;
  removeFromComparison: (subzoneId: string) => void;
  clearComparison: () => void;
  filters: {
    region?: string;
    percentile?: number;
    search?: string;
  };
  setFilters: (filters: Partial<MapContextType['filters']>) => void;
  clearFilters: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const [selectedSubzone, setSelectedSubzone] = useState<Subzone | null>(null);
  const [comparisonSubzones, setComparisonSubzones] = useState<Subzone[]>([]);
  const [filters, setFiltersState] = useState<MapContextType['filters']>({});

  const addToComparison = (subzone: Subzone) => {
    if (comparisonSubzones.length >= 2) {
      throw new Error('Maximum two subzones allowed for comparison');
    }
    if (comparisonSubzones.some(s => s.subzoneId === subzone.subzoneId)) {
      throw new Error('Subzone already in comparison');
    }
    setComparisonSubzones(prev => [...prev, subzone]);
  };

  const removeFromComparison = (subzoneId: string) => {
    setComparisonSubzones(prev => prev.filter(s => s.subzoneId !== subzoneId));
  };

  const clearComparison = () => {
    setComparisonSubzones([]);
  };

  const setFilters = (newFilters: Partial<MapContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFiltersState({});
  };

  const value: MapContextType = {
    selectedSubzone,
    setSelectedSubzone,
    comparisonSubzones,
    addToComparison,
    removeFromComparison,
    clearComparison,
    filters,
    setFilters,
    clearFilters,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
}
