import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-neon-cyan/10 to-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-neon-blue/5 to-neon-cyan/5 rounded-full blur-3xl animate-pulse-slow"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Scanning line effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-shimmer"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <Header />
        
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-screen">
            <div className="relative">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 bg-gradient-to-br from-neon-cyan/5 to-transparent pointer-events-none"></div>
      <div className="fixed top-0 right-0 w-32 h-32 bg-gradient-to-bl from-neon-blue/5 to-transparent pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-neon-purple/5 to-transparent pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-neon-pink/5 to-transparent pointer-events-none"></div>
    </div>
  );
}