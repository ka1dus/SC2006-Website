import React from 'react';

export default function TestDesign() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
      {/* Test the dark theme */}
      <div className="p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent animate-glow">
          TESTING FUTURISTIC DESIGN
        </h1>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Test Card 1 */}
          <div className="bg-dark-800/50 backdrop-blur-xl rounded-2xl border border-neon-cyan/20 p-6 shadow-glow">
            <div className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center shadow-glow mb-4">
              <span className="text-2xl">🏪</span>
            </div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">Neon Card</h3>
            <p className="text-dark-300">This should have a dark background with neon borders and glowing effects.</p>
          </div>
          
          {/* Test Card 2 */}
          <div className="bg-dark-800/50 backdrop-blur-xl rounded-2xl border border-neon-purple/20 p-6 shadow-glow">
            <div className="w-12 h-12 bg-gradient-to-br from-neon-purple to-neon-pink rounded-xl flex items-center justify-center shadow-glow mb-4 animate-float">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">Floating Card</h3>
            <p className="text-dark-300">This card should float up and down with animation.</p>
          </div>
          
          {/* Test Card 3 */}
          <div className="bg-dark-800/50 backdrop-blur-xl rounded-2xl border border-neon-green/20 p-6 shadow-glow">
            <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-neon-cyan rounded-xl flex items-center justify-center shadow-glow mb-4 animate-pulse-slow">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">Pulsing Card</h3>
            <p className="text-dark-300">This card should pulse slowly with a glow effect.</p>
          </div>
        </div>
        
        {/* Test Animations */}
        <div className="mt-8 flex space-x-4">
          <div className="w-4 h-4 bg-neon-cyan rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-4 h-4 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-4 h-4 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
}
