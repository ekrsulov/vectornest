import { useRef, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { logger } from '../utils/logger';

export interface RenderCountData {
  count: number;
  rps: number; // Renders per second
}

/**
 * Debug hook to count component renders and calculate renders per second.
 * 
 * Note: The useEffect intentionally has no dependency array to run on every render.
 * This is the correct pattern for a render counter.
 * 
 * @param componentName - Optional name to identify the component in logs
 * @returns Object with render count and renders per second
 */
export const useRenderCount = (componentName?: string): RenderCountData => {
  const renderCount = useRef(0);
  const timestamps = useRef<number[]>([]);
  const rps = useRef(0);
  
  // Track render counts and calculate RPS inside useEffect to keep render phase pure.
  // This runs after every render (no deps), so the count is always accurate.
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    timestamps.current.push(now);
    
    // Keep only timestamps from the last 2 seconds
    const twoSecondsAgo = now - 2000;
    timestamps.current = timestamps.current.filter(t => t > twoSecondsAgo);
    
    // Calculate renders per second based on last 2 seconds
    if (timestamps.current.length > 1) {
      const timeSpan = (now - timestamps.current[0]) / 1000; // in seconds
      rps.current = timeSpan > 0 ? timestamps.current.length / timeSpan : 0;
    } else {
      rps.current = 0;
    }
    
    if (componentName && useCanvasStore.getState().settings.showRenderCountBadges) {
      logger.debug(`[Render Count] ${componentName}: ${renderCount.current} (${rps.current.toFixed(1)} r/s)`);
    }
  }); // Intentionally no deps - runs every render

  return {
    count: renderCount.current,
    rps: Math.round(rps.current)
  };
};
