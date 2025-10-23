import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import CompareView to avoid SSR issues
const CompareView = dynamic(
  () => import('@/screens/MainUI/CompareView').then(mod => mod.CompareView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Comparison...</p>
        </div>
      </div>
    ),
  }
);

export default function ComparePage() {
  return (
    <>
      <Head>
        <title>Compare Subzones - Hawker Opportunity Score</title>
      </Head>
      <CompareView />
    </>
  );
}

