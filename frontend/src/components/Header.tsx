import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="relative bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 border-b border-neon-cyan/20 backdrop-blur-xl">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 via-transparent to-neon-blue/5 animate-pulse-slow"></div>
      
      {/* Glowing top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center space-x-4">
              {/* Animated logo */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-purple rounded-2xl flex items-center justify-center shadow-glow-lg group-hover:scale-110 transition-all duration-500">
                  <span className="text-3xl filter drop-shadow-lg">🏪</span>
                </div>
                {/* Rotating ring */}
                <div className="absolute -inset-2 border-2 border-neon-cyan/30 rounded-2xl animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent animate-glow">
                  HAWKER SCORE
                </h1>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  <p className="text-sm text-dark-300 font-mono tracking-widest uppercase">
                    Opportunity Analytics Platform
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link
              href="/"
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                router.pathname === '/'
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/30 shadow-glow'
                  : 'text-dark-300 hover:text-neon-cyan hover:bg-dark-800/50 hover:shadow-lg hover:shadow-neon-cyan/10'
              }`}
            >
              <span className="relative z-10 flex items-center space-x-2">
                <span className="text-lg">🗺️</span>
                <span>Map Analytics</span>
              </span>
              {router.pathname === '/' && (
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 rounded-xl animate-pulse"></div>
              )}
            </Link>
            
            {isAdmin && (
              <Link
                href="/admin"
                className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  router.pathname.startsWith('/admin')
                    ? 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-neon-purple border border-neon-purple/30 shadow-glow'
                    : 'text-dark-300 hover:text-neon-purple hover:bg-dark-800/50 hover:shadow-lg hover:shadow-neon-purple/10'
                }`}
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <span className="text-lg">⚙️</span>
                  <span>Admin Panel</span>
                </span>
                {router.pathname.startsWith('/admin') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 rounded-xl animate-pulse"></div>
                )}
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 px-4 py-3 bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/50 hover:border-neon-green/30 transition-all duration-300">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-neon-cyan rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg">👤</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 rounded-xl blur opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-dark-100">{user?.name}</p>
                {isAdmin && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></div>
                    <span className="text-xs font-mono text-neon-pink uppercase tracking-wider">
                      Admin
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="group relative px-4 py-3 rounded-xl text-sm font-semibold text-dark-300 hover:text-neon-pink hover:bg-red-500/10 hover:border-red-500/30 border border-transparent transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <span className="text-lg group-hover:animate-bounce">🚪</span>
                <span>Logout</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}