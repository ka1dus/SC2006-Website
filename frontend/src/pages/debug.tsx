import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function DebugPage() {
  const [status, setStatus] = useState<string>('Testing...');
  const [backendStatus, setBackendStatus] = useState<string>('Unknown');
  const [testToken, setTestToken] = useState<string>('');
  const { login, user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const testBackend = async () => {
      try {
        // Test backend health
        const healthResponse = await fetch('http://localhost:3001/health');
        if (healthResponse.ok) {
          setBackendStatus('✅ Backend is running');
          
          // Test login
          const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'client@example.com',
              password: 'password'
            })
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            setStatus('✅ Backend login working');
            setTestToken(loginData.data.token);
          } else {
            setStatus('❌ Backend login failed');
          }
        } else {
          setBackendStatus('❌ Backend not responding');
          setStatus('❌ Backend health check failed');
        }
      } catch (error) {
        setBackendStatus('❌ Backend connection failed');
        setStatus(`❌ Error: ${error}`);
      }
    };

    testBackend();
  }, []);

  const handleAutoLogin = async () => {
    if (testToken) {
      try {
        await login(testToken);
        setStatus('✅ Auto-login successful! Redirecting...');
        setTimeout(() => router.push('/'), 1000);
      } catch (error) {
        setStatus(`❌ Auto-login failed: ${error}`);
      }
    }
  };

  const handleManualLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Debug & Test Page
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Backend Status:</h3>
              <p className="text-sm text-gray-600">{backendStatus}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Login Test:</h3>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Current User:</h3>
              <p className="text-sm text-gray-600">
                {isAuthenticated ? `✅ Logged in as: ${user?.email}` : '❌ Not logged in'}
              </p>
            </div>
            
            {testToken && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Test Token Available:</h3>
                <p className="text-xs text-green-700 break-all">{testToken.substring(0, 50)}...</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 space-y-3">
            {testToken && !isAuthenticated && (
              <button
                onClick={handleAutoLogin}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                🚀 Auto-Login with Test Token
              </button>
            )}
            
            <button
              onClick={handleManualLogin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              📝 Manual Login
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              🏠 Go to Main Page
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Use this page to test the authentication system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
