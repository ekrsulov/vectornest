import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { createListenerContext, installGlobalPluginListeners } from '../../utils/pluginListeners';
import { useCanvasStore } from '../../store/canvasStore';
// (useCanvasStore imported above)
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { MIN_ZOOM, MAX_ZOOM } from '../../constants';
import { calculatePinchZoom, calculateGesturePan } from '../utils/touchGestureUtils';

interface TouchInfo {
  id: number;
  x: number;
  y: number;
}

interface GestureState {
  touches: TouchInfo[];
  initialDistance: number | null;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  initialMidpoint: { x: number; y: number } | null;
  isGestureActive: boolean;
}

const getTouchInfo = (touch: Touch): TouchInfo => ({
  id: touch.identifier,
  x: touch.clientX,
  y: touch.clientY,
});

const calculateDistance = (touch1: TouchInfo, touch2: TouchInfo): number => {
  const dx = touch2.x - touch1.x;
  const dy = touch2.y - touch1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateMidpoint = (touch1: TouchInfo, touch2: TouchInfo): { x: number; y: number } => ({
  x: (touch1.x + touch2.x) / 2,
  y: (touch1.y + touch2.y) / 2,
});

/**
 * Hook to handle mobile touch gestures for zoom and pan on the canvas
 * Supports:
 * - Pinch-to-zoom with two fingers
 * - Two-finger pan
 */
export const useMobileTouchGestures = (
  svgRef: RefObject<SVGSVGElement | null>,
  cancelSelection?: () => void
): void => {
  const gestureStateRef = useRef<GestureState>({
    touches: [],
    initialDistance: null,
    initialZoom: 1,
    initialPanX: 0,
    initialPanY: 0,
    initialMidpoint: null,
    isGestureActive: false,
  });

  // Use a ref for cancelSelection to avoid re-attaching listeners when it changes
  const cancelSelectionRef = useRef(cancelSelection);
  cancelSelectionRef.current = cancelSelection;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      // Only handle multi-touch gestures (2 or more fingers)
      if (event.touches.length < 2) {
        gestureStateRef.current.touches = [];
        gestureStateRef.current.initialDistance = null;
        gestureStateRef.current.initialMidpoint = null;
        gestureStateRef.current.isGestureActive = false;
        return;
      }

      // Cancel any active selection when a gesture starts
      if (cancelSelectionRef.current) {
        cancelSelectionRef.current();
      }

      // Prevent default behavior for multi-touch
      event.preventDefault();
      event.stopPropagation();

      const touch1 = getTouchInfo(event.touches[0]);
      const touch2 = getTouchInfo(event.touches[1]);

      const distance = calculateDistance(touch1, touch2);
      const midpoint = calculateMidpoint(touch1, touch2);

      const state = useCanvasStore.getState();
      const { zoom, panX, panY } = state.viewport;

      gestureStateRef.current = {
        touches: [touch1, touch2],
        initialDistance: distance,
        initialZoom: zoom,
        initialPanX: panX,
        initialPanY: panY,
        initialMidpoint: midpoint,
        isGestureActive: true,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Only handle multi-touch gestures
      if (event.touches.length < 2 || !gestureStateRef.current.initialDistance) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const touch1 = getTouchInfo(event.touches[0]);
      const touch2 = getTouchInfo(event.touches[1]);

      const currentDistance = calculateDistance(touch1, touch2);
      const currentMidpoint = calculateMidpoint(touch1, touch2);

      const state = gestureStateRef.current;

      if (!state.initialMidpoint || !state.initialDistance) {
        return;
      }

      // Calculate zoom based on pinch distance
      const newZoom = calculatePinchZoom(
        currentDistance,
        state.initialDistance,
        state.initialZoom,
        { min: MIN_ZOOM, max: MAX_ZOOM }
      );

      // Calculate pan based on finger movement
      const rect = svg.getBoundingClientRect();
      const zoomRatio = newZoom / state.initialZoom;

      const newPan = calculateGesturePan({
        initialMidpoint: state.initialMidpoint,
        currentMidpoint,
        initialPan: { x: state.initialPanX, y: state.initialPanY },
        zoomRatio,
        svgRect: rect,
      });

      // Update viewport
      useCanvasStore.setState((currentState) => ({
        viewport: {
          ...currentState.viewport,
          zoom: formatToPrecision(newZoom, PATH_DECIMAL_PRECISION),
          panX: newPan.x,
          panY: newPan.y,
        },
      }));
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const wasGestureActive = gestureStateRef.current.isGestureActive;

      // Reset gesture state when fingers are lifted
      if (event.touches.length < 2) {
        gestureStateRef.current.touches = [];
        gestureStateRef.current.initialDistance = null;
        gestureStateRef.current.initialMidpoint = null;
        gestureStateRef.current.isGestureActive = false;

        // IMPORTANT: Only prevent default if a multi-touch gesture was active
        // This allows single-tap events (including double-tap detection) to work normally
        if (wasGestureActive) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    const handleTouchCancel = () => {
      // Reset gesture state on cancel
      gestureStateRef.current.touches = [];
      gestureStateRef.current.initialDistance = null;
      gestureStateRef.current.initialMidpoint = null;
      gestureStateRef.current.isGestureActive = false;
    };

    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => svg, event: 'touchstart', handler: handleTouchStart, options: { passive: false } },
      { target: () => svg, event: 'touchmove', handler: handleTouchMove, options: { passive: false } },
      { target: () => svg, event: 'touchend', handler: handleTouchEnd, options: { passive: false } },
      { target: () => svg, event: 'touchcancel', handler: handleTouchCancel, options: { passive: false } },
    ]);

    return cleanup;
  }, [svgRef]);
};
