/**
 * MapDebugPanel Component
 * Shows feature count, breaks, and last error for debugging
 */

interface MapDebugPanelProps {
  featureCount?: number;
  breaks?: number[];
  lastError?: string;
}

export function MapDebugPanel({ featureCount, breaks, lastError }: MapDebugPanelProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 text-xs bg-black/50 backdrop-blur rounded px-2 py-1 text-white font-mono">
      <div>feat: {featureCount ?? '?'}</div>
      <div>breaks: {breaks?.join(', ') ?? '—'}</div>
      {lastError && <div className="text-red-300 mt-1">err: {lastError}</div>}
    </div>
  );
}
