import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import MapView from '@/components/MapView';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TestPage() {
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Auto-login with test credentials
    const autoLogin = async () => {
      try {
        // Get test token from backend
        const response = await fetch('http://localhost:3001/test-token');
        const data = await response.json();
        
        if (data.token) {
          // Store token in localStorage
          localStorage.setItem('token', data.token);
          
          // Login with the token
          await login(data.token);
          
          // Redirect to main page
          router.push('/');
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        // Fallback to manual login
        router.push('/login');
      }
    };

    autoLogin();
  }, [login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Auto-logging in...</p>
        <p className="mt-2 text-sm text-gray-500">
          If this takes too long, <a href="/login" className="text-blue-600 hover:underline">click here to login manually</a>
        </p>
      </div>
    </div>
  );
}
