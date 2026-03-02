import { MIN_ZOOM, MAX_ZOOM } from '../constants';
import { fitToSelection } from '../canvas/viewport/ViewportController';
import type { Viewport } from '../types';
import type { CanvasElement } from '../types';
import type { Bounds } from './boundsUtils';
import { collectSelectedElementBounds } from './arrangementUtils';
import type { CanvasFitSize } from './artboardViewportFitUtils';

export const getSelectionBoundsForFit = (
  elements: CanvasElement[],
  selectedIds: string[],
): Bounds | null => {
  const selectedBounds = collectSelectedElementBounds(elements, selectedIds, 1);
  if (selectedBounds.length === 0) {
    return null;
  }

  return selectedBounds.reduce<Bounds | null>((combined, entry) => {
    if (!combined) {
      return { ...entry.bounds };
    }

    return {
      minX: Math.min(combined.minX, entry.bounds.minX),
      minY: Math.min(combined.minY, entry.bounds.minY),
      maxX: Math.max(combined.maxX, entry.bounds.maxX),
      maxY: Math.max(combined.maxY, entry.bounds.maxY),
    };
  }, null);
};

export const hasSelectionForFit = (
  elements: CanvasElement[],
  selectedIds: string[],
): boolean => getSelectionBoundsForFit(elements, selectedIds) !== null;

export const fitViewportToSelection = ({
  viewport,
  canvasSize,
  elements,
  selectedIds,
  padding = 32,
}: {
  viewport: Viewport;
  canvasSize: CanvasFitSize;
  elements: CanvasElement[];
  selectedIds: string[];
  padding?: number;
}): Viewport | null => {
  const bounds = getSelectionBoundsForFit(elements, selectedIds);
  if (!bounds) {
    return null;
  }

  return fitToSelection(viewport, {
    bounds,
    viewportSize: {
      width: Number.isFinite(canvasSize.width) && canvasSize.width > 0 ? canvasSize.width : 1,
      height: Number.isFinite(canvasSize.height) && canvasSize.height > 0 ? canvasSize.height : 1,
    },
    padding,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });
};
