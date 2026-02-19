import type React from 'react';
import { useMemo } from 'react';
import { useCanvasServiceActivation } from '../../../canvas/hooks/useCanvasServiceActivation';
import { useCanvasStore } from '../../../store/canvasStore';
import { DUPLICATE_ON_DRAG_SERVICE_ID, type DuplicateOnDragServiceState } from '../service';
import type { Point } from '../../../types';
import { buildElementMap } from '../../../utils';

interface UseDuplicateOnDragParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentMode: string;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  isEnabled?: boolean;
}

/**
 * Hook that manages duplicate on drag functionality.
 * This service is always active and listens for Command+Drag gestures.
 * If isEnabled is false, the service is not activated.
 */
export function useDuplicateOnDrag(params: UseDuplicateOnDragParams): void {
  const { svgRef, currentMode, screenToCanvas, isEnabled = true } = params;

  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const elements = useCanvasStore((state) => state.elements);

  // Memoize the element map to avoid creating a new Map on every render
  const elementMap = useMemo(
    () => buildElementMap(elements),
    [elements]
  );

  // Create a ref object that's null when disabled to prevent activation
  const effectiveSvgRef = useMemo(
    () => (isEnabled ? svgRef : { current: null }),
    [isEnabled, svgRef]
  );

  useCanvasServiceActivation<DuplicateOnDragServiceState>({
    serviceId: DUPLICATE_ON_DRAG_SERVICE_ID,
    svgRef: effectiveSvgRef as React.RefObject<SVGSVGElement | null>,
    selectState: () => ({
      activePlugin: currentMode,
      selectedIds,
      elementMap,
      screenToCanvas,
    }),
    stateDeps: [currentMode, selectedIds, elementMap, screenToCanvas],
  });
}
