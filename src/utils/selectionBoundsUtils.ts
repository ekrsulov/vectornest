import type { CanvasElement, PathData, Command } from '../types';
import { calculateRawCommandsBounds } from './rawBoundsUtils';

/**
 * Selection Bounds and Snap Utilities
 * 
 * Consolidated utilities for calculating bounds across selections
 * and applying snap logic. This centralizes the min/max calculations
 * that were previously duplicated across drag handlers.
 */

export interface BoundsResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface SelectionBoundsOptions {
  includeStroke?: boolean;
  zoom?: number;
}

/**
 * Calculate bounds for a set of commands (e.g., selected points or subpaths).
 * This consolidates the min/max loop logic used across drag handlers.
 * 
 * @param commands - Commands to measure
 * @param strokeWidth - Stroke width to include in bounds
 * @param zoom - Zoom level for stroke adjustment
 * @returns Bounds result with min/max/center/dimensions
 */
export function calculateCommandsBounds(
  commands: Command[],
  strokeWidth: number = 0,
  zoom: number = 1
): BoundsResult {
  const bounds = calculateRawCommandsBounds(commands, {
    includeStroke: true,
    strokeWidth,
    zoom,
  });
  if (!bounds) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      centerX: 0,
      centerY: 0,
      width: 0,
      height: 0,
    };
  }

  const { minX, minY, maxX, maxY } = bounds;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX,
    centerY,
    width,
    height,
  };
}

/**
 * Calculate overall bounds for multiple elements.
 * Useful for selection bounds across full elements.
 * 
 * @param elements - Elements to measure
 * @param options - Bounds calculation options
 * @returns Bounds result encompassing all elements
 */
export function calculateMultiElementBounds(
  elements: CanvasElement[],
  options: SelectionBoundsOptions = {}
): BoundsResult {
  const { includeStroke = true, zoom = 1 } = options;
  
  let overallMinX = Infinity;
  let overallMinY = Infinity;
  let overallMaxX = -Infinity;
  let overallMaxY = -Infinity;

  elements.forEach((element) => {
    if (element.type === 'path') {
      const pathData = element.data as PathData;
      const commands = pathData.subPaths.flat();
      const strokeWidth = includeStroke ? (pathData.strokeWidth || 0) : 0;
      
      const bounds = calculateCommandsBounds(commands, strokeWidth, zoom);
      
      overallMinX = Math.min(overallMinX, bounds.minX);
      overallMinY = Math.min(overallMinY, bounds.minY);
      overallMaxX = Math.max(overallMaxX, bounds.maxX);
      overallMaxY = Math.max(overallMaxY, bounds.maxY);
    } else {
      // For groups, native shapes, and plugin elements: extract bounds from data properties
      const data = element.data as Record<string, unknown>;
      if (data && typeof data.x === 'number' && typeof data.y === 'number' &&
          typeof data.width === 'number' && typeof data.height === 'number') {
        overallMinX = Math.min(overallMinX, data.x as number);
        overallMinY = Math.min(overallMinY, data.y as number);
        overallMaxX = Math.max(overallMaxX, (data.x as number) + (data.width as number));
        overallMaxY = Math.max(overallMaxY, (data.y as number) + (data.height as number));
      }
    }
  });

  // Guard against no elements contributing bounds
  if (overallMinX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
  }

  const centerX = (overallMinX + overallMaxX) / 2;
  const centerY = (overallMinY + overallMaxY) / 2;
  const width = overallMaxX - overallMinX;
  const height = overallMaxY - overallMinY;

  return {
    minX: overallMinX,
    minY: overallMinY,
    maxX: overallMaxX,
    maxY: overallMaxY,
    centerX,
    centerY,
    width,
    height,
  };
}

/**
 * Calculate bounds for selected subpaths within elements.
 * Consolidates subpath bounds calculation logic.
 * 
 * @param elements - All elements
 * @param selectedSubpaths - Map of element ID to selected subpath indices
 * @param zoom - Zoom level
 * @returns Bounds result for selected subpaths
 */
export function calculateSubpathsBounds(
  elements: CanvasElement[],
  selectedSubpaths: Map<string, Set<number>>,
  zoom: number = 1
): BoundsResult {
  let overallMinX = Infinity;
  let overallMinY = Infinity;
  let overallMaxX = -Infinity;
  let overallMaxY = -Infinity;

  elements.forEach((element) => {
    if (element.type !== 'path') return;
    
    const selectedIndices = selectedSubpaths.get(element.id);
    if (!selectedIndices || selectedIndices.size === 0) return;

    const pathData = element.data as PathData;
    const strokeWidth = pathData.strokeWidth || 0;

    selectedIndices.forEach((subpathIndex) => {
      const subpath = pathData.subPaths[subpathIndex];
      if (!subpath) return;

      const bounds = calculateCommandsBounds(subpath, strokeWidth, zoom);
      
      overallMinX = Math.min(overallMinX, bounds.minX);
      overallMinY = Math.min(overallMinY, bounds.minY);
      overallMaxX = Math.max(overallMaxX, bounds.maxX);
      overallMaxY = Math.max(overallMaxY, bounds.maxY);
    });
  });

  // Guard against no subpaths contributing bounds
  if (overallMinX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
  }

  const centerX = (overallMinX + overallMaxX) / 2;
  const centerY = (overallMinY + overallMaxY) / 2;
  const width = overallMaxX - overallMinX;
  const height = overallMaxY - overallMinY;

  return {
    minX: overallMinX,
    minY: overallMinY,
    maxX: overallMaxX,
    maxY: overallMaxY,
    centerX,
    centerY,
    width,
    height,
  };
}
