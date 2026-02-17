import { useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import { SmoothBrushController } from '../interactions/SmoothBrushController';
import type { Point } from '../../../types';
import type { SmoothBrushPluginSlice } from '../slice';

export interface SmoothBrushState {
  isActive: boolean;
  cursorPosition: Point | null;
  smoothBrush: SmoothBrushPluginSlice['smoothBrush'];
}

export interface SmoothBrushActions {
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  updateCursorPosition: (position: Point) => void;
  applyBrush: (position: Point) => void;
}

export type UseCanvasSmoothBrushReturn = SmoothBrushState & SmoothBrushActions;

/**
 * Hook for managing smooth brush functionality
 * Handles smooth brush activation, cursor updates, and application
 */
export const useCanvasSmoothBrush = (): UseCanvasSmoothBrushReturn => {
  // Use granular selectors to prevent re-renders on cursor position changes
  // cursorX/cursorY are NOT subscribed here - cursor is managed with local state in Canvas
  const isActive = useCanvasStore(state => state.smoothBrush?.isActive ?? false);
  const radius = useCanvasStore(state => state.smoothBrush?.radius ?? 50);
  const strength = useCanvasStore(state => state.smoothBrush?.strength ?? 0.5);
  const simplifyPoints = useCanvasStore(state => state.smoothBrush?.simplifyPoints ?? true);
  const simplificationTolerance = useCanvasStore(state => state.smoothBrush?.simplificationTolerance ?? 1);
  const minDistance = useCanvasStore(state => state.smoothBrush?.minDistance ?? 5);
  const affectedPoints = useCanvasStore(state => state.smoothBrush?.affectedPoints ?? []);

  // Reconstruct smoothBrush object with all necessary properties
  // cursorX/cursorY are managed locally in Canvas to avoid re-renders
  const smoothBrush = useMemo(() => ({
    radius,
    strength,
    isActive,
    cursorX: 0, // Not used - cursor managed with local state in Canvas
    cursorY: 0, // Not used - cursor managed with local state in Canvas
    simplifyPoints,
    simplificationTolerance,
    minDistance,
    affectedPoints,
  }), [radius, strength, isActive, simplifyPoints, simplificationTolerance, minDistance, affectedPoints]);

  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

  const controller = useMemo(() => new SmoothBrushController({
    activateSmoothBrush: () => useCanvasStore.getState().activateSmoothBrush?.(),
    deactivateSmoothBrush: () => useCanvasStore.getState().deactivateSmoothBrush?.(),
    updateSmoothBrushCursor: (x, y) => useCanvasStore.getState().updateSmoothBrushCursor?.(x, y),
    applySmoothBrush: (x, y) => useCanvasStore.getState().applySmoothBrush?.(x, y),
    isSmoothBrushActive: () => useCanvasStore.getState().smoothBrush?.isActive ?? false,
  }), []);

  const activateSmoothBrush = useCallback(() => {
    controller.activate();
  }, [controller]);

  const deactivateSmoothBrush = useCallback(() => {
    controller.deactivate();
  }, [controller]);

  const updateCursorPosition = useCallback((position: Point) => {
    setCursorPosition(position);
    controller.updateCursor(position);
  }, [controller]);

  const applyBrush = useCallback((position: Point) => {
    controller.apply(position);
  }, [controller]);

  return {
    isActive,
    cursorPosition,
    smoothBrush,
    activateSmoothBrush,
    deactivateSmoothBrush,
    updateCursorPosition,
    applyBrush,
  };
};