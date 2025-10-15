import React from 'react';

export default function ForceReload() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
      {/* Force reload message */}
      <div className="absolute inset-0 flex items-center justify-center z-50">
        <div className="text-center bg-dark-800/90 backdrop-blur-xl rounded-3xl border border-neon-cyan/30 p-12 shadow-glow-lg">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-3xl flex items-center justify-center border border-neon-cyan/30 shadow-glow animate-pulse">
            <span className="text-4xl">🔄</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent animate-glow mb-4">
            FORCE RELOAD REQUIRED
          </h1>
          <p className="text-xl text-dark-200 mb-6">
            Your browser is showing cached content
          </p>
          <div className="space-y-4">
            <p className="text-dark-300">
              <strong>To see the futuristic design:</strong>
            </p>
            <div className="text-left space-y-2 text-sm text-dark-400">
              <p>1. Press <kbd className="bg-dark-700 px-2 py-1 rounded">Ctrl+Shift+R</kbd> (Windows/Linux)</p>
              <p>2. Press <kbd className="bg-dark-700 px-2 py-1 rounded">Cmd+Shift+R</kbd> (Mac)</p>
              <p>3. Or open Developer Tools → Right-click refresh → "Empty Cache and Hard Reload"</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
      
      {/* Background effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
    </div>
  );
}
