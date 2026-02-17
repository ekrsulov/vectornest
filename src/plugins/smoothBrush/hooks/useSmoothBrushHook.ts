import { useState } from 'react';
import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasServiceActivation } from '../../../canvas/hooks/useCanvasServiceActivation';
import { SMOOTH_BRUSH_SERVICE_ID, type SmoothBrushServiceState } from '../listeners/SmoothBrushListener';
import type { Point } from '../../../types';
import { useCanvasStore } from '../../../store/canvasStore';
import type { SmoothBrushPluginSlice } from '../slice';

/**
 * Hook that manages smooth brush functionality.
 * Registered as a plugin hook to handle smooth brush interactions.
 */
export function useSmoothBrushHook(context: PluginHooksContext): void {
  const { svgRef, activePlugin: currentMode, screenToCanvas, emitPointerEvent } = context;
  
  // Get smooth brush active state and functions from store
  const isSmoothBrushActive = useCanvasStore(state => 
    (state as unknown as SmoothBrushPluginSlice).smoothBrush?.isActive ?? false
  );
  const applySmoothBrush = useCanvasStore(state => 
    (state as unknown as SmoothBrushPluginSlice).applySmoothBrush
  );
  const updateAffectedPoints = useCanvasStore(state => 
    (state as unknown as SmoothBrushPluginSlice).updateAffectedPoints
  );

  // Local state for smooth brush cursor position (not in store to avoid re-renders)
  const [_smoothBrushCursor, setSmoothBrushCursor] = useState<Point>({ x: 0, y: 0 });

  // Setup native listeners for smooth brush
  useCanvasServiceActivation<SmoothBrushServiceState>({
    serviceId: SMOOTH_BRUSH_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin: currentMode,
      isSmoothBrushActive,
      screenToCanvas,
      emitPointerEvent,
      getApplySmoothBrush: () => applySmoothBrush ?? (() => {}),
      getUpdateAffectedPoints: () => updateAffectedPoints ?? (() => {}),
      setSmoothBrushCursor,
    }),
    stateDeps: [currentMode, isSmoothBrushActive, screenToCanvas, applySmoothBrush, updateAffectedPoints],
  });
}
