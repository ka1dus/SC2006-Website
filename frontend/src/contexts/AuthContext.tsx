import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { decode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Bypass authentication - always show as logged in
  const [user, setUser] = useState<User>({
    id: 'demo-user',
    email: 'demo@hawker-score.sg',
    name: 'Demo User',
    role: 'CLIENT',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip authentication check
    setLoading(false);
  }, []);

  const login = async (token: string) => {
    // Skip actual login process
    console.log('Login bypassed - using demo user');
  };

  const logout = () => {
    // Skip logout - keep demo user
    console.log('Logout bypassed - staying as demo user');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: true, // Always authenticated
    isAdmin: false, // Demo user is not admin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
