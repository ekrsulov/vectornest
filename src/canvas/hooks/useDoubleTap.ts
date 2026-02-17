import { useRef, useCallback } from 'react';
import { DEFAULT_DOUBLE_TAP_CONFIG, isDoubleTap } from '../../utils/tapUtils';

interface DoubleTapState {
  time: number;
  x: number;
  y: number;
  elementId: string | null;
  subpathIndex?: number;
}

interface DoubleTapOptions {
  timeThreshold?: number; // milliseconds
  distanceThreshold?: number; // pixels
}

interface DoubleTapHandlers {
  handleElementTouchEnd: (elementId: string, event: React.TouchEvent<Element>) => boolean;
  handleSubpathTouchEnd: (elementId: string, subpathIndex: number, event: React.TouchEvent<Element>) => boolean;
  handleCanvasTouchEnd: (event: React.TouchEvent<SVGSVGElement>) => boolean;
}

/**
 * Hook to detect double tap gestures on elements, subpaths, and canvas
 * Returns true if a double tap was detected, false otherwise
 */
export const useDoubleTap = (options: DoubleTapOptions = {}): DoubleTapHandlers => {
  const {
    timeThreshold = DEFAULT_DOUBLE_TAP_CONFIG.timeThreshold,
    distanceThreshold = DEFAULT_DOUBLE_TAP_CONFIG.distanceThreshold,
  } = options;

  const lastTapRef = useRef<DoubleTapState | null>(null);

  const handleElementTouchEnd = useCallback(
    (elementId: string, event: React.TouchEvent<Element>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;
      const currentTap = { time: now, x, y };

      // Check for double tap
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === elementId &&
        lastTapRef.current.subpathIndex === undefined &&
        isDoubleTap(currentTap, lastTapRef.current, { timeThreshold, distanceThreshold })
      ) {
        // Double tap detected
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap - record it
      lastTapRef.current = { ...currentTap, elementId };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  const handleSubpathTouchEnd = useCallback(
    (elementId: string, subpathIndex: number, event: React.TouchEvent<Element>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;
      const currentTap = { time: now, x, y };

      // Check for double tap on same subpath
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === elementId &&
        lastTapRef.current.subpathIndex === subpathIndex &&
        isDoubleTap(currentTap, lastTapRef.current, { timeThreshold, distanceThreshold })
      ) {
        // Double tap detected on subpath
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap on subpath - record it
      lastTapRef.current = { ...currentTap, elementId, subpathIndex };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  const handleCanvasTouchEnd = useCallback(
    (event: React.TouchEvent<SVGSVGElement>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;
      const currentTap = { time: now, x, y };

      // Check for double tap on empty space (no elementId)
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === null &&
        isDoubleTap(currentTap, lastTapRef.current, { timeThreshold, distanceThreshold })
      ) {
        // Double tap detected on empty space
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap on empty space - record it
      lastTapRef.current = { ...currentTap, elementId: null };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  return {
    handleElementTouchEnd,
    handleSubpathTouchEnd,
    handleCanvasTouchEnd,
  };
};
