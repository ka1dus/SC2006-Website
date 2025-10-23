import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { MapProvider } from '@/contexts/MapContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/styles/globals.css';
import '@/styles/map.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MapProvider>
            <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
              <Component {...pageProps} />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#06b6d4',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </MapProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
