/**
 * Subzone Selection Hook
 * Manages selection state with max limit (default 2 for comparison)
 */

import { useCallback, useState } from 'react';

export function useSubzoneSelection(max = 2) {
  const [selected, setSelected] = useState<string[]>([]);

  const add = useCallback(
    (id: string) => {
      setSelected((prev) =>
        prev.includes(id) ? prev : prev.length >= max ? prev : [...prev, id]
      );
    },
    [max]
  );

  const remove = useCallback((id: string) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length >= max
          ? prev
          : [...prev, id]
      );
    },
    [max]
  );

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selected.includes(id);
    },
    [selected]
  );

  return {
    selected,
    add,
    remove,
    toggle,
    clear,
    isSelected,
    count: selected.length,
    isFull: selected.length >= max,
  };
}

