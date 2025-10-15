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
    <aside className="w-[420px] bg-dark-900/80 backdrop-blur-2xl shadow-2xl border-r border-neon-cyan/20 h-screen overflow-y-auto custom-scrollbar">
      {/* Sidebar Header */}
      <div className="relative p-8 border-b border-dark-700/50">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-neon-blue/5 opacity-50"></div>
        
        <div className="relative space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-lg flex items-center justify-center shadow-glow">
              <span className="text-lg">📊</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Analytics Dashboard
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
            <p className="text-sm text-dark-300 font-mono tracking-wider uppercase">
              Real-time Hawker Opportunity Analysis
            </p>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2 text-xs text-dark-400">
            <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></div>
            <span>System Online</span>
            <span className="text-neon-cyan">•</span>
            <span>Data Synced</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Filter Panel */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 shadow-xl hover:border-neon-cyan/30 transition-all duration-300">
            <FilterPanel />
          </div>
        </div>
        
        {/* Comparison Tray */}
        {comparisonSubzones.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 shadow-xl hover:border-neon-purple/30 transition-all duration-300">
              <ComparisonTray />
            </div>
          </div>
        )}
        
        {/* Subzone Details */}
        {selectedSubzone ? (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-green/10 to-neon-cyan/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 shadow-xl hover:border-neon-green/30 transition-all duration-300">
              <SubzoneDetails subzone={selectedSubzone} />
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-3xl blur-lg animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-neon-cyan/30 to-neon-blue/30 rounded-3xl flex items-center justify-center border border-neon-cyan/30 shadow-glow">
                <span className="text-4xl animate-float">🎯</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-dark-100 mb-3">
              No Subzone Selected
            </h3>
            <p className="text-sm text-dark-400 leading-relaxed max-w-xs mx-auto">
              Click on a subzone on the map to view detailed analytics and opportunity scores
            </p>
            
            {/* Animated dots */}
            <div className="flex justify-center space-x-1 mt-6">
              <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}