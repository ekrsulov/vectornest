import type { Point } from '../types';
import { useCanvasStore } from '../store/canvasStore';

/**
 * Shared grid snapping utility
 * Single source of truth for grid snap behavior across the application
 */

/**
 * Snap a point to the grid based on current grid settings
 * @param point - The point to snap
 * @returns The snapped point
 */
export function applyGridSnap(point: Point): Point {
  const state = useCanvasStore.getState();
  const { grid, snapToGrid } = state;
  
  // Only snap if grid is enabled and snap is enabled
  if (!grid?.enabled || !grid?.snapEnabled || !snapToGrid) {
    return point;
  }
  
  return snapToGrid(point.x, point.y);
}
