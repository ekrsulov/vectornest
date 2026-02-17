import type { Viewport, Point } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { clamp } from '../../utils/coreHelpers';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ViewportConstraints {
  minZoom?: number;
  maxZoom?: number;
}

export interface ClampOptions extends ViewportConstraints {
  viewportSize?: ViewportSize | null;
  contentBounds?: Bounds | null;
  padding?: number;
}

export interface SetZoomOptions extends ClampOptions {
  /**
   * Optional center in screen coordinates relative to the SVG element's top-left corner.
   * When provided, the pan values are updated to preserve the visual focus on this point.
   */
  center?: Point | null;
}

export type SetPanOptions = ClampOptions;

export interface FitToSelectionOptions extends ClampOptions {
  bounds: Bounds | null | undefined;
  viewportSize: ViewportSize;
  padding?: number;
}

const DEFAULT_MIN_ZOOM = 0.1;
export const DEFAULT_MAX_ZOOM = 5;
const DEFAULT_PADDING = 32;

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return clamp(value, min, max);
};

const normalisePan = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
};

const withPrecision = (value: number): number =>
  formatToPrecision(value, PATH_DECIMAL_PRECISION);

const computeViewBox = (viewport: Viewport, size: ViewportSize) => {
  const { zoom, panX, panY } = viewport;
  return {
    x: -panX / zoom,
    y: -panY / zoom,
    width: size.width / zoom,
    height: size.height / zoom,
  };
};

const getPadding = (padding?: number): number =>
  typeof padding === 'number' ? padding : DEFAULT_PADDING;

export const clampViewport = (
  viewport: Viewport,
  options: ClampOptions = {}
): Viewport => {
  const { minZoom = DEFAULT_MIN_ZOOM, maxZoom = DEFAULT_MAX_ZOOM, viewportSize, contentBounds } = options;

  const zoom = clampNumber(viewport.zoom, minZoom, maxZoom);
  let panX = normalisePan(viewport.panX);
  let panY = normalisePan(viewport.panY);

  if (viewportSize && contentBounds) {
    const padding = getPadding(options.padding);
    const paddedMinX = contentBounds.minX - padding;
    const paddedMaxX = contentBounds.maxX + padding;
    const paddedMinY = contentBounds.minY - padding;
    const paddedMaxY = contentBounds.maxY + padding;

    const viewBox = computeViewBox({ zoom, panX, panY }, viewportSize);

    const minViewX = paddedMinX;
    const maxViewX = paddedMaxX - viewBox.width;
    const minViewY = paddedMinY;
    const maxViewY = paddedMaxY - viewBox.height;

    let targetViewX = viewBox.x;
    let targetViewY = viewBox.y;

    if (minViewX > maxViewX) {
      // Content narrower than viewport - centre horizontally
      const centreX = (paddedMinX + paddedMaxX) / 2;
      targetViewX = centreX - viewBox.width / 2;
    } else {
      targetViewX = clampNumber(targetViewX, minViewX, maxViewX);
    }

    if (minViewY > maxViewY) {
      // Content shorter than viewport - centre vertically
      const centreY = (paddedMinY + paddedMaxY) / 2;
      targetViewY = centreY - viewBox.height / 2;
    } else {
      targetViewY = clampNumber(targetViewY, minViewY, maxViewY);
    }

    panX = -targetViewX * zoom;
    panY = -targetViewY * zoom;
  }

  return {
    zoom: clampNumber(zoom, minZoom, maxZoom),
    panX: withPrecision(panX),
    panY: withPrecision(panY),
  };
};

export const setZoom = (
  viewport: Viewport,
  zoom: number,
  options: SetZoomOptions = {}
): Viewport => {
  const { minZoom = DEFAULT_MIN_ZOOM, maxZoom = DEFAULT_MAX_ZOOM, center } = options;
  const nextZoom = clampNumber(zoom, minZoom, maxZoom);

  let panX = viewport.panX;
  let panY = viewport.panY;

  if (center) {
    const ratio = viewport.zoom !== 0 ? nextZoom / viewport.zoom : 1;
    panX = center.x - (center.x - viewport.panX) * ratio;
    panY = center.y - (center.y - viewport.panY) * ratio;
  }

  return clampViewport(
    { zoom: nextZoom, panX, panY },
    options
  );
};

export const setPan = (
  viewport: Viewport,
  pan: { x?: number; y?: number },
  options: SetPanOptions = {}
): Viewport => {
  const nextPanX = typeof pan.x === 'number' ? pan.x : viewport.panX;
  const nextPanY = typeof pan.y === 'number' ? pan.y : viewport.panY;

  return clampViewport(
    { zoom: viewport.zoom, panX: nextPanX, panY: nextPanY },
    options
  );
};

export const fitToSelection = (
  viewport: Viewport,
  options: FitToSelectionOptions
): Viewport => {
  const { bounds, viewportSize } = options;
  if (!bounds) {
    return clampViewport(viewport, options);
  }

  const padding = getPadding(options.padding);
  const selectionWidth = Math.max(bounds.maxX - bounds.minX, 0);
  const selectionHeight = Math.max(bounds.maxY - bounds.minY, 0);

  const availableWidth = Math.max(viewportSize.width - padding * 2, 1);
  const availableHeight = Math.max(viewportSize.height - padding * 2, 1);

  const zoomX = selectionWidth > 0 ? availableWidth / selectionWidth : DEFAULT_MAX_ZOOM;
  const zoomY = selectionHeight > 0 ? availableHeight / selectionHeight : DEFAULT_MAX_ZOOM;
  const targetZoom = Math.min(zoomX, zoomY);

  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreY = (bounds.minY + bounds.maxY) / 2;

  const nextZoom = clampNumber(targetZoom, options.minZoom ?? DEFAULT_MIN_ZOOM, options.maxZoom ?? DEFAULT_MAX_ZOOM);
  const panX = viewportSize.width / 2 - centreX * nextZoom;
  const panY = viewportSize.height / 2 - centreY * nextZoom;

  return clampViewport(
    { zoom: nextZoom, panX, panY },
    { ...options, viewportSize }
  );
};

export const getViewBoxString = (viewport: Viewport, size: ViewportSize): string => {
  const box = computeViewBox(viewport, size);
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
};
