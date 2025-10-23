import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import HomeMapScreen to avoid SSR issues with Mapbox
const HomeMapScreen = dynamic(
  () => import('@/screens/MainUI/HomeMapScreen').then(mod => mod.HomeMapScreen),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Map...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <>
      <Head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <title>Hawker Opportunity Score - Map Analytics</title>
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
      </Head>
      <HomeMapScreen />
    </>
  );
}
