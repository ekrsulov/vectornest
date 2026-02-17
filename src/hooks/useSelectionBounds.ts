import { useMemo } from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../utils/canvasColorUtils';
import { computeAdjustedBounds, measureSelectedSubpaths } from '../utils/overlayHelpers';
import type { Matrix } from '../utils/matrixUtils';

interface SelectionBoundsElement {
  id: string;
  type: string;
  data: unknown;
  zIndex: number;
}

interface SelectedSubpath {
  elementId: string;
  subpathIndex: number;
}

interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

interface SubpathBoundsResult {
  subpathIndex: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  rawBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface UseSelectionBoundsResult {
  selectionColor: string;
  strokeWidth: number;
  adjustedElementBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
  elementRects: SelectionRect[];
  subpathBoundsResults: SubpathBoundsResult[];
  subpathRects: SelectionRect[];
  subpathSelectionColor: string;
}

interface UseSelectionBoundsParams {
  element: SelectionBoundsElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  viewport: Viewport;
  selectedSubpaths?: SelectedSubpath[];
  /** If true, skips subpath measurements (used in transformation mode) */
  skipSubpathMeasurements?: boolean;
  transformMatrix?: Matrix;
}

/**
 * Hook to compute selection bounds data for overlay components
 * Consolidates the common pattern used in SelectionOverlay and TransformationOverlay:
 * - Derives selection colors from element
 * - Computes adjusted bounds accounting for zoom
 * - Measures selected subpaths
 * - Builds rectangle data for rendering
 * 
 * @example
 * ```tsx
 * const {
 *   selectionColor,
 *   adjustedElementBounds,
 *   elementRects,
 *   subpathRects,
 * } = useSelectionBounds({
 *   element,
 *   bounds,
 *   viewport,
 *   selectedSubpaths,
 * });
 * ```
 */
export function useSelectionBounds({
  element,
  bounds,
  viewport,
  selectedSubpaths = [],
  skipSubpathMeasurements = false,
  transformMatrix,
}: UseSelectionBoundsParams): UseSelectionBoundsResult {
  // Extract element colors - memoized by element reference
  const { selectionColor } = useMemo(
    () => deriveElementSelectionColors(element),
    [element]
  );

  // Calculate stroke width based on zoom
  const strokeWidth = 1 / viewport.zoom;

  // Calculate adjusted bounds for the element - memoized by bounds and zoom
  const adjustedElementBounds = useMemo(
    () => bounds ? computeAdjustedBounds(bounds, viewport.zoom) : null,
    [bounds, viewport.zoom]
  );

  // Measure selected subpaths - memoized by dependencies
  const subpathBoundsResults = useMemo(
    () => {
      if (skipSubpathMeasurements || selectedSubpaths.length === 0) {
        return [];
      }
      return measureSelectedSubpaths(element, selectedSubpaths, viewport.zoom, 5, transformMatrix);
    },
    [element, selectedSubpaths, viewport.zoom, skipSubpathMeasurements, transformMatrix]
  );

  // Build element rects - memoized by adjusted bounds
  const elementRects = useMemo(
    () => {
      if (!adjustedElementBounds) return [];
      return [{
        x: adjustedElementBounds.minX,
        y: adjustedElementBounds.minY,
        width: adjustedElementBounds.maxX - adjustedElementBounds.minX,
        height: adjustedElementBounds.maxY - adjustedElementBounds.minY,
        key: `element-${element.id}`,
      }];
    },
    [adjustedElementBounds, element.id]
  );

  // Build subpath rects - memoized by subpath bounds
  const subpathRects = useMemo(
    () => subpathBoundsResults.map((result) => ({
      x: result.bounds.minX,
      y: result.bounds.minY,
      width: result.width,
      height: result.height,
      key: `subpath-${element.id}-${result.subpathIndex}`,
    })),
    [subpathBoundsResults, element.id]
  );

  return {
    selectionColor,
    strokeWidth,
    adjustedElementBounds,
    elementRects,
    subpathBoundsResults,
    subpathRects,
    subpathSelectionColor: SUBPATH_SELECTION_COLOR,
  };
}
