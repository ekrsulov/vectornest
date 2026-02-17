import React, { useMemo, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { SnapPointVisualization } from '../../overlays/SnapPointOverlay';
import type { ObjectSnapState } from './slice';

/**
 * ObjectSnapOverlay shows available snap points while:
 * 1. Dragging (always shown during drag)
 * 2. When showSnapPoints is enabled (shows all static points)
 */

interface ObjectSnapOverlayProps {
  objectSnap: ObjectSnapState;
}

export const ObjectSnapOverlay: React.FC<ObjectSnapOverlayProps> = ({ objectSnap }) => {
  const viewport = useCanvasStore((state) => state.viewport);
  const isDragging = useCanvasStore((state) => state.isDragging);
  const snapPoints = useCanvasStore((state) => state.snapPoints); // Read from global state

  // Static snap points are calculated once and cached
  // This is to avoid recalculating them on every render while showing them
  const staticCalculatedRef = useRef<boolean>(false);

  useEffect(() => {
    // Calculate static snap points once when showSnapPoints is enabled
    const showSnapPoints = snapPoints?.showSnapPoints ?? false;

    if (showSnapPoints && !staticCalculatedRef.current) {
      // Get static snap points from state
      const state = useCanvasStore.getState();
      if (state.findAvailableSnapPoints) {
        state.findAvailableSnapPoints?.([]);
        staticCalculatedRef.current = true;
      }
    }

    // Reset when showSnapPoints is disabled
    if (!showSnapPoints) {
      staticCalculatedRef.current = false;
    }
  }, [snapPoints?.showSnapPoints]);

  // Compute active snap points (the ones that were actually snapped to)
  const activeSnapPoints = useMemo(() => {
    return objectSnap.currentSnapPoint ? [objectSnap.currentSnapPoint] : [];
  }, [objectSnap.currentSnapPoint]);

  const showSnapPointsValue = snapPoints?.showSnapPoints ?? false;
  const snapPointsOpacity = snapPoints?.snapPointsOpacity ?? 50;

  // Show if dragging OR if showSnapPoints is enabled
  if (!isDragging && !showSnapPointsValue) {
    return null;
  }

  return (
    <SnapPointVisualization
      allSnapPoints={objectSnap.staticSnapPoints}
      activeSnapPoint={activeSnapPoints[0] ?? null}
      viewport={viewport}
      showAllPoints={showSnapPointsValue}
      allPointsOpacity={snapPointsOpacity / 100}
    />
  );
};
