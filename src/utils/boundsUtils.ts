/**
 * Bounds Utilities — Re-exports from measurementUtils.
 *
 * This module exists for backward-compatibility with existing imports.
 * Prefer importing directly from `measurementUtils` for new code.
 */

export type { Bounds } from './measurementUtils';
export { measurePath as calculateBounds } from './measurementUtils';

/**
 * Compute axis-aligned bounding box from an array of corner points.
 * Avoids the `Math.min/max(...spread)` pattern that risks stack overflow on large arrays.
 */
export function boundsFromCorners(corners: ReadonlyArray<{ x: number; y: number }>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  return { minX, minY, maxX, maxY };
}
