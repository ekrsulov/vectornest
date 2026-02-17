import { measureSubpathBounds } from './measurementUtils';
import type { PathData } from '../types';
import { logger } from './logger';
import { applyToPoint, type Matrix } from './matrixUtils';
import { boundsFromCorners } from './boundsUtils';

export interface AdjustedBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes adjusted bounds with a zoom-dependent offset
 */
export function computeAdjustedBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number,
  offsetPx: number = 5
): AdjustedBounds {
  const offset = offsetPx / zoom;
  return {
    minX: bounds.minX - offset,
    minY: bounds.minY - offset,
    maxX: bounds.maxX + offset,
    maxY: bounds.maxY + offset,
  };
}

export interface SubpathBoundsResult {
  subpathIndex: number;
  bounds: AdjustedBounds;
  rawBounds: { minX: number; minY: number; maxX: number; maxY: number };
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Measures bounds for selected subpaths, returning adjusted bounds for each
 */
export function measureSelectedSubpaths(
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>,
  zoom: number,
  offsetPx: number = 5,
  transformMatrix?: Matrix
): SubpathBoundsResult[] {
  if (element.type !== 'path') return [];

  const results: SubpathBoundsResult[] = [];

  try {
    const pathData = element.data as PathData;
    const subpaths = pathData.subPaths;

    selectedSubpaths
      .filter(sp => sp.elementId === element.id)
      .forEach((selected) => {
        if (selected.subpathIndex >= subpaths.length) return;

        const subpath = subpaths[selected.subpathIndex];
        // Measure in local world space (zoom=1)
        const rawBounds = measureSubpathBounds(subpath, pathData.strokeWidth ?? 1, 1);

        if (!rawBounds) return;

        let finalRawBounds = rawBounds;

        // Apply global transform if provided
        if (transformMatrix) {
          const corners = [
            { x: rawBounds.minX, y: rawBounds.minY },
            { x: rawBounds.maxX, y: rawBounds.minY },
            { x: rawBounds.maxX, y: rawBounds.maxY },
            { x: rawBounds.minX, y: rawBounds.maxY }
          ].map(p => applyToPoint(transformMatrix, p));

          finalRawBounds = boundsFromCorners(corners);
        }

        const adjustedBounds = computeAdjustedBounds(finalRawBounds, zoom, offsetPx);
        const width = adjustedBounds.maxX - adjustedBounds.minX;
        const height = adjustedBounds.maxY - adjustedBounds.minY;
        const centerX = finalRawBounds.minX + (finalRawBounds.maxX - finalRawBounds.minX) / 2;
        const centerY = finalRawBounds.minY + (finalRawBounds.maxY - finalRawBounds.minY) / 2;

        results.push({
          subpathIndex: selected.subpathIndex,
          bounds: adjustedBounds,
          rawBounds: finalRawBounds,
          width,
          height,
          centerX,
          centerY,
        });
      });
  } catch (error) {
    logger.warn('Failed to calculate subpath bounds', error);
  }

  return results;
}
