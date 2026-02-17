/**
 * Bounds Comparators
 * 
 * Centralized comparison utilities for bounding boxes to support
 * memoization and change detection across the application.
 * 
 * Use these comparators in React.memo, useMemo, or custom comparison logic
 * to prevent unnecessary re-renders when bounds haven't actually changed.
 */

import type { Command } from '../types';
import { measureSubpathBounds } from './measurementUtils';

export interface RoundedBbox {
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

/**
 * Get rounded bounding box from bounds result
 * Rounds coordinates to integer pixels to avoid floating-point comparison issues
 */
export function getRoundedBbox(
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null
): RoundedBbox | null {
  if (!bounds) return null;

  return {
    topLeft: {
      x: Math.round(bounds.minX),
      y: Math.round(bounds.minY),
    },
    bottomRight: {
      x: Math.round(bounds.maxX),
      y: Math.round(bounds.maxY),
    },
  };
}

/**
 * Compare two rounded bounding boxes for equality
 * Returns true if boxes are equal, false if different
 */
export function areBboxesEqual(
  prev: RoundedBbox | null,
  next: RoundedBbox | null
): boolean {
  if (prev === null && next === null) return true;
  if (prev === null || next === null) return false;

  return (
    prev.topLeft.x === next.topLeft.x &&
    prev.topLeft.y === next.topLeft.y &&
    prev.bottomRight.x === next.bottomRight.x &&
    prev.bottomRight.y === next.bottomRight.y
  );
}

/**
 * Check if bounds have changed for an element (complete path)
 * Returns true if bounds changed, false if they're the same
 * 
 * @param prevCommands - Previous path commands
 * @param nextCommands - Next path commands
 * @param prevStrokeWidth - Previous stroke width
 * @param nextStrokeWidth - Next stroke width
 * @param zoom - Current zoom level (default: 1)
 * @returns true if bounds changed, false otherwise
 */
export function haveBoundsChanged(
  prevCommands: Command[],
  nextCommands: Command[],
  prevStrokeWidth: number,
  nextStrokeWidth: number,
  zoom: number = 1
): boolean {
  // If strokeWidth changed, bounds definitely changed
  if (prevStrokeWidth !== nextStrokeWidth) {
    return true;
  }

  // Measure bounds
  const prevBoundsResult = prevCommands.length > 0
    ? measureSubpathBounds(prevCommands, prevStrokeWidth, zoom)
    : null;
  const nextBoundsResult = nextCommands.length > 0
    ? measureSubpathBounds(nextCommands, nextStrokeWidth, zoom)
    : null;

  // Get rounded bboxes
  const prevBbox = getRoundedBbox(prevBoundsResult);
  const nextBbox = getRoundedBbox(nextBoundsResult);

  // Compare
  return !areBboxesEqual(prevBbox, nextBbox);
}
