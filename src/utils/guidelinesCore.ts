/**
 * Guidelines Core - Centralized Guidelines Logic
 * 
 * This module provides the core logic for guidelines calculation:
 * - Distance scanning between elements
 * - Shared utilities to avoid duplication between overlay and slice
 */

import type { Bounds } from './guidelinesHelpers';
import { rangesOverlap, type ElementBoundsInfo } from './guidelinesHelpers';

export type { Bounds, ElementBoundsInfo } from './guidelinesHelpers';

/**
 * Distance guideline result
 */
export interface DistanceScanResult {
  axis: 'horizontal' | 'vertical';
  distance: number;
  referenceStart: number;
  referenceEnd: number;
  referenceElementIds: [string, string];
  bounds1: Bounds;
  bounds2: Bounds;
}

/**
 * Scan for distance guidelines between elements
 * Single source of truth for distance calculation logic
 * 
 * @param boundsArray - Array of element bounds info
 * @param options - Configuration options
 * @returns Array of distance guideline results
 */
export function guidelineDistanceScan(
  boundsArray: ElementBoundsInfo[],
  options: {
    includeHorizontal?: boolean;
    includeVertical?: boolean;
    roundDistance?: boolean;
  } = {}
): DistanceScanResult[] {
  const {
    includeHorizontal = true,
    includeVertical = true,
    roundDistance = true,
  } = options;

  const results: DistanceScanResult[] = [];

  // Horizontal distances - only for elements whose Y ranges overlap
  if (includeHorizontal) {
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const info1 = boundsArray[i];
        const info2 = boundsArray[j];

        // Check if Y ranges overlap (in horizontal band)
        if (!rangesOverlap(info1.bounds.minY, info1.bounds.maxY, info2.bounds.minY, info2.bounds.maxY)) {
          continue;
        }

        // Check if elements are horizontally adjacent
        const distance1Raw = info2.bounds.minX - info1.bounds.maxX;
        const distance2Raw = info1.bounds.minX - info2.bounds.maxX;
        
        const distance1 = roundDistance ? Math.round(distance1Raw) : distance1Raw;
        const distance2 = roundDistance ? Math.round(distance2Raw) : distance2Raw;

        if (distance1 > 0) {
          results.push({
            axis: 'horizontal',
            distance: distance1,
            referenceStart: info1.bounds.maxX,
            referenceEnd: info2.bounds.minX,
            referenceElementIds: [info1.id, info2.id],
            bounds1: info1.bounds,
            bounds2: info2.bounds,
          });
        }

        if (distance2 > 0) {
          results.push({
            axis: 'horizontal',
            distance: distance2,
            referenceStart: info2.bounds.maxX,
            referenceEnd: info1.bounds.minX,
            referenceElementIds: [info2.id, info1.id],
            bounds1: info2.bounds,
            bounds2: info1.bounds,
          });
        }
      }
    }
  }

  // Vertical distances - only for elements whose X ranges overlap
  if (includeVertical) {
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const info1 = boundsArray[i];
        const info2 = boundsArray[j];

        // Check if X ranges overlap (in vertical band)
        if (!rangesOverlap(info1.bounds.minX, info1.bounds.maxX, info2.bounds.minX, info2.bounds.maxX)) {
          continue;
        }

        // Check if elements are vertically adjacent
        const distance1Raw = info2.bounds.minY - info1.bounds.maxY;
        const distance2Raw = info1.bounds.minY - info2.bounds.maxY;
        
        const distance1 = roundDistance ? Math.round(distance1Raw) : distance1Raw;
        const distance2 = roundDistance ? Math.round(distance2Raw) : distance2Raw;

        if (distance1 > 0) {
          results.push({
            axis: 'vertical',
            distance: distance1,
            referenceStart: info1.bounds.maxY,
            referenceEnd: info2.bounds.minY,
            referenceElementIds: [info1.id, info2.id],
            bounds1: info1.bounds,
            bounds2: info2.bounds,
          });
        }

        if (distance2 > 0) {
          results.push({
            axis: 'vertical',
            distance: distance2,
            referenceStart: info2.bounds.maxY,
            referenceEnd: info1.bounds.minY,
            referenceElementIds: [info2.id, info1.id],
            bounds1: info2.bounds,
            bounds2: info1.bounds,
          });
        }
      }
    }
  }

  return results;
}
