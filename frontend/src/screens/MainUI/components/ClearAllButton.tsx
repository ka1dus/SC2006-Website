/**
 * ClearAllButton Component
 * Sticky button to clear all selections
 */

import React from 'react';

interface ClearAllButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ClearAllButton({ onClick, disabled = false }: ClearAllButtonProps) {
  if (disabled) return null;

  return (
    <button
      className="clear-all-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Clear all selections"
    >
      ✕ Clear All
    </button>
  );
}

