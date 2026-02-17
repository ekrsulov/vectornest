/**
 * Point Utilities - Coordinate Transformation Functions
 * 
 * Single source of truth for screen-to-canvas coordinate transformations.
 * Use these functions instead of duplicating transformation logic.
 */

import type { Point, Viewport } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';

/**
 * Convert screen/client coordinates to canvas coordinates accounting for viewport.
 * This is the primary function for coordinate transformation.
 * 
 * @param screenX - Screen X coordinate (e.g., clientX from mouse event)
 * @param screenY - Screen Y coordinate (e.g., clientY from mouse event)
 * @param svg - SVG element to get bounding rect from (can be null)
 * @param viewport - Viewport with zoom, panX, and panY
 * @param options - Optional configuration
 * @returns Canvas coordinates as Point
 */
export function clientToCanvas(
  screenX: number,
  screenY: number,
  svg: SVGSVGElement | null,
  viewport: Viewport,
  options: { applyPrecision?: boolean } = {}
): Point {
  const { applyPrecision = false } = options;
  const rect = svg?.getBoundingClientRect() ?? { left: 0, top: 0 } as DOMRect;
  
  const canvasX = (screenX - rect.left - viewport.panX) / viewport.zoom;
  const canvasY = (screenY - rect.top - viewport.panY) / viewport.zoom;
  
  if (applyPrecision) {
    return {
      x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION),
      y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION),
    };
  }
  
  return { x: canvasX, y: canvasY };
}

/**
 * Convert SVG-local coordinates to canvas coordinates accounting for viewport.
 * SVG-local means coordinates relative to the SVG element (already offset from screen).
 */
export function svgToCanvas(
  svgX: number,
  svgY: number,
  viewport: Viewport,
  options: { applyPrecision?: boolean } = {}
): Point {
  const { applyPrecision = true } = options;
  const canvasX = (svgX - viewport.panX) / viewport.zoom;
  const canvasY = (svgY - viewport.panY) / viewport.zoom;

  if (applyPrecision) {
    return {
      x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION),
      y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION),
    };
  }

  return { x: canvasX, y: canvasY };
}
