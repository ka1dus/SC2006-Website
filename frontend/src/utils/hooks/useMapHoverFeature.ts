/**
 * Map Hover Feature Hook
 * Manages hover state for map features
 */

import { useState, useCallback } from 'react';

export function useMapHoverFeature() {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const onEnter = useCallback((id: string) => {
    setHoverId(id);
  }, []);

  const onLeave = useCallback(() => {
    setHoverId(null);
  }, []);

  return {
    hoverId,
    onEnter,
    onLeave,
  };
}

