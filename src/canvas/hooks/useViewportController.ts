import { useCallback, useMemo, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { Bounds } from '../../utils/boundsUtils';
import { clientToCanvas } from '../../utils/pointUtils';
import type { Point, Viewport } from '../../types';
import {
  clampViewport as clampViewportState,
  fitToSelection as fitViewportToSelection,
  getViewBoxString,
  setPan as setViewportPan,
  setZoom as setViewportZoom,
  type ClampOptions,
  type FitToSelectionOptions,
  type SetPanOptions,
  type SetZoomOptions,
  type ViewportSize,
} from '../viewport/ViewportController';

interface ViewportControllerHook {
  viewport: Viewport;
  /** Sets an absolute zoom level. */
  setZoom: (zoom: number, options?: SetZoomOptions) => void;
  /** Multiplies the current zoom by a factor. */
  zoomBy: (factor: number, options?: SetZoomOptions) => void;
  /** Sets the pan values directly. */
  setPan: (pan: { x?: number; y?: number }, options?: SetPanOptions) => void;
  /** Applies a delta to the current pan values. */
  panBy: (deltaX: number, deltaY: number, options?: SetPanOptions) => void;
  /** Fits the viewport to a set of bounds. */
  fitToSelection: (bounds: Bounds | null | undefined, size: ViewportSize, options?: Partial<Omit<FitToSelectionOptions, 'bounds' | 'viewportSize'>>) => void;
  /** Returns a clamped viewport based on the provided options. */
  clampViewport: (viewport: Viewport, options?: ClampOptions) => Viewport;
  /** Converts screen coordinates to canvas coordinates for a given SVG element. */
  screenToCanvas: (svg: SVGSVGElement | null, x: number, y: number) => Point;
  /** Returns a viewBox string for the provided size using the latest viewport. */
  getViewBoxString: (size: ViewportSize) => string;
}

export const useViewportController = (): ViewportControllerHook => {
  const viewport = useCanvasStore((state) => state.viewport);

  // Keep viewport in a ref for stable callback references
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const applyViewportUpdate = useCallback((updater: (viewport: Viewport) => Viewport) => {
    useCanvasStore.setState((state) => ({
      viewport: updater(state.viewport),
    }));
  }, []);

  const setZoom = useCallback<ViewportControllerHook['setZoom']>((zoom, options) => {
    applyViewportUpdate((current) => setViewportZoom(current, zoom, options));
  }, [applyViewportUpdate]);

  const zoomBy = useCallback<ViewportControllerHook['zoomBy']>((factor, options) => {
    applyViewportUpdate((current) => setViewportZoom(current, current.zoom * factor, options));
  }, [applyViewportUpdate]);

  const setPan = useCallback<ViewportControllerHook['setPan']>((pan, options) => {
    applyViewportUpdate((current) => setViewportPan(current, pan, options));
  }, [applyViewportUpdate]);

  const panBy = useCallback<ViewportControllerHook['panBy']>((deltaX, deltaY, options) => {
    applyViewportUpdate((current) =>
      setViewportPan(current, { x: current.panX + deltaX, y: current.panY + deltaY }, options)
    );
  }, [applyViewportUpdate]);

  const fitToSelection = useCallback<ViewportControllerHook['fitToSelection']>((bounds, size, options) => {
    if (!bounds) {
      return;
    }

    const fitOptions: FitToSelectionOptions = {
      bounds,
      viewportSize: size,
      ...options,
    };

    applyViewportUpdate((current) => fitViewportToSelection(current, fitOptions));
  }, [applyViewportUpdate]);

  const clampViewport = useCallback<ViewportControllerHook['clampViewport']>((nextViewport, options) => {
    return clampViewportState(nextViewport, options);
  }, []);

  // Use ref-based viewport for stable callback identity
  const screenToCanvas = useCallback<ViewportControllerHook['screenToCanvas']>((svg, x, y) => {
    return clientToCanvas(x, y, svg, viewportRef.current, { applyPrecision: true });
  }, []);

  const getViewBoxStringForSize = useCallback<ViewportControllerHook['getViewBoxString']>((size) => {
    return getViewBoxString(viewportRef.current, size);
  }, []);

  return useMemo(() => ({
    viewport,
    setZoom,
    zoomBy,
    setPan,
    panBy,
    fitToSelection,
    clampViewport,
    screenToCanvas,
    getViewBoxString: getViewBoxStringForSize,
  }), [
    viewport,
    setZoom,
    zoomBy,
    setPan,
    panBy,
    fitToSelection,
    clampViewport,
    screenToCanvas,
    getViewBoxStringForSize,
  ]);
};

