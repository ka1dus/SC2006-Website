import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import { useMap } from '@/contexts/MapContext';
import LoadingSpinner from './LoadingSpinner';
import DataVisualization from './DataVisualization';
import toast from 'react-hot-toast';

interface MapViewProps {
  className?: string;
}

export default function MapView({ className = '' }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [showDataViz, setShowDataViz] = useState(true); // Default to data visualization
  const { filters, setSelectedSubzone } = useMap();

  // Fetch subzones data
  const { data: subzones, isLoading, error } = useQuery(
    ['subzones', filters],
    () => subzoneService.getAllSubzones(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Initialize simple map visualization
  useEffect(() => {
    if (!mapContainer.current || mapLoaded) return;

    try {
      // Create a simple SVG-based map visualization
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', '0 0 1000 800');
      svg.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)';
      
      // Add grid pattern
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'grid');
      pattern.setAttribute('width', '50');
      pattern.setAttribute('height', '50');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 50 0 L 0 0 0 50');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(0, 255, 255, 0.1)');
      path.setAttribute('stroke-width', '1');
      
      pattern.appendChild(path);
      defs.appendChild(pattern);
      svg.appendChild(defs);
      
      // Add grid
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'url(#grid)');
      svg.appendChild(rect);
      
      // Add some sample subzone polygons
      if (subzones && subzones.length > 0) {
        subzones.forEach((subzone: any, index: number) => {
          const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          
          // Create a simple polygon based on subzone data
          const x = 200 + (index % 3) * 200;
          const y = 150 + Math.floor(index / 3) * 150;
          const size = 80;
          
          const points = [
            `${x},${y}`,
            `${x + size},${y}`,
            `${x + size},${y + size}`,
            `${x},${y + size}`
          ].join(' ');
          
          polygon.setAttribute('points', points);
          
          // Color based on score
          const score = subzone.score?.H || 0;
          let color = '#1e293b'; // dark-800
          if (score >= 0.8) color = '#10b981'; // emerald-500
          else if (score >= 0.6) color = '#06b6d4'; // cyan-500
          else if (score >= 0.4) color = '#2563eb'; // blue-600
          else if (score >= 0.2) color = '#eab308'; // yellow-500
          
          polygon.setAttribute('fill', color);
          polygon.setAttribute('stroke', '#06b6d4');
          polygon.setAttribute('stroke-width', '2');
          polygon.setAttribute('opacity', '0.8');
          
          // Add hover effect
          polygon.addEventListener('mouseenter', () => {
            polygon.setAttribute('opacity', '1');
            polygon.setAttribute('stroke-width', '3');
          });
          
          polygon.addEventListener('mouseleave', () => {
            polygon.setAttribute('opacity', '0.8');
            polygon.setAttribute('stroke-width', '2');
          });
          
          // Add click handler
          polygon.addEventListener('click', () => {
            setSelectedSubzone(subzone);
            toast.success(`Selected ${subzone.name}`);
          });
          
          svg.appendChild(polygon);
          
          // Add subzone label
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', (x + size/2).toString());
          text.setAttribute('y', (y + size/2).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('fill', '#ffffff');
          text.setAttribute('font-size', '12');
          text.setAttribute('font-weight', 'bold');
          text.textContent = subzone.name;
          svg.appendChild(text);
        });
      }
      
      if (mapContainer.current) {
        mapContainer.current.appendChild(svg);
        setMapLoaded(true);
      }
      
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError(true);
    }
  }, [subzones, setSelectedSubzone]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30 shadow-glow">
            <span className="text-4xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-red-300 mb-3">
            Failed to Load Data
          </h3>
          <p className="text-sm text-dark-400">
            {(error as any)?.message || 'Unable to fetch subzone data'}
          </p>
        </div>
      </div>
    );
  }

  // Show data visualization by default
  if (showDataViz || mapError) {
    return <DataVisualization />;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-3xl flex items-center justify-center border border-neon-cyan/30 shadow-glow">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-xl font-bold text-dark-100 mb-3">
              Loading Map Data
            </p>
            <p className="text-sm text-dark-400">
              Analyzing hawker opportunity scores...
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full bg-dark-900"
        style={{ minHeight: '100vh' }}
      />

      {/* Map Controls Overlay */}
      <div className="absolute top-6 right-6 z-20 space-y-3">
        {/* Legend */}
        <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl border border-dark-700/50 p-6 shadow-2xl">
          <h4 className="text-sm font-bold text-dark-100 mb-4 flex items-center space-x-2">
            <span className="text-lg">🎨</span>
            <span>Legend</span>
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-emerald-500 rounded shadow-glow"></div>
              <span className="text-dark-200 font-semibold">High Opportunity</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-cyan-500 rounded shadow-glow"></div>
              <span className="text-dark-200 font-semibold">Medium Opportunity</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-600 rounded shadow-glow"></div>
              <span className="text-dark-200 font-semibold">Low Opportunity</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-dark-800 rounded border border-dark-600"></div>
              <span className="text-dark-200 font-semibold">No Data</span>
            </div>
          </div>
        </div>

        {/* Toggle Data Visualization */}
        <button
          onClick={() => setShowDataViz(!showDataViz)}
          className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-dark-900 px-4 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300"
        >
          📊 Data View
        </button>
      </div>

      {/* Instructions */}
      {mapLoaded && subzones && (
        <div className="absolute bottom-6 left-6 z-20">
          <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl border border-dark-700/50 p-6 shadow-2xl max-w-sm">
            <h4 className="text-sm font-bold text-dark-100 mb-3 flex items-center space-x-2">
              <span className="text-lg">💡</span>
              <span>Instructions</span>
            </h4>
            <p className="text-xs text-dark-300 leading-relaxed">
              Click on any colored area to view detailed hawker opportunity analytics. 
              Use the filters in the sidebar to refine your analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}