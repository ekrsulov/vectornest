import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useCanvasStore } from '../store/canvasStore';
import { getSelectionBoundsForFit } from '../utils/selectionViewportFitUtils';
import type { Bounds } from '../utils/boundsUtils';

export function useRulerSelectionBounds(): Bounds | null {
  const { elements, selectedIds } = useCanvasStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
    }))
  );

  return useMemo(() => {
    if (selectedIds.length === 0) {
      return null;
    }

    return getSelectionBoundsForFit(elements, selectedIds);
  }, [elements, selectedIds]);
}
