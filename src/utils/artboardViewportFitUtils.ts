import { MIN_ZOOM, MAX_ZOOM } from '../constants';
import { fitToSelection } from '../canvas/viewport/ViewportController';
import type { Viewport } from '../types';
import type { Bounds } from './boundsUtils';

export type ArtboardFitState = {
  enabled?: boolean;
  exportBounds?: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null;
} | null | undefined;

export type CanvasFitSize = {
  width: number;
  height: number;
};

const toPositiveFinite = (value: number, fallback: number): number => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

export const getActiveArtboardBounds = (artboard: ArtboardFitState): Bounds | null => {
  if (!artboard?.enabled || !artboard.exportBounds) {
    return null;
  }

  const { minX, minY, width, height } = artboard.exportBounds;
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
  };
};

export const hasActiveArtboardForFit = (artboard: ArtboardFitState): boolean => (
  getActiveArtboardBounds(artboard) !== null
);

export const fitViewportToActiveArtboard = ({
  viewport,
  canvasSize,
  artboard,
  padding = 0,
}: {
  viewport: Viewport;
  canvasSize: CanvasFitSize;
  artboard: ArtboardFitState;
  padding?: number;
}): Viewport | null => {
  const bounds = getActiveArtboardBounds(artboard);
  if (!bounds) {
    return null;
  }

  return fitToSelection(viewport, {
    bounds,
    viewportSize: {
      width: toPositiveFinite(canvasSize.width, 1),
      height: toPositiveFinite(canvasSize.height, 1),
    },
    padding,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });
};
