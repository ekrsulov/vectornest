import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import { PencilDrawingService } from '../services/PencilDrawingService';
import type { Point } from '../../../types';
import type { PencilPluginSlice } from '../slice';
import type { StyleSlice } from '../../../store/slices/features/styleSlice';

interface UsePencilDrawingParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentMode: string;
  pencil: PencilPluginSlice['pencil'];
  style: StyleSlice['style'];
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    point: Point
  ) => void;
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
}

interface UsePencilDrawingReturn {
  pencilDrawingService: PencilDrawingService;
  registerPencilDrawingService: (service: PencilDrawingService) => void;
  resetPencilDrawingService: () => void;
}

/**
 * Hook that manages pencil drawing functionality.
 * Handles native pencil drawing with smooth path creation.
 */
export function usePencilDrawing(
  params: UsePencilDrawingParams
): UsePencilDrawingReturn {
  const {
    svgRef,
    currentMode,
    pencil,
    style,
    viewportZoom,
    scaleStrokeWithZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
    finalizePath,
  } = params;

  // Service management
  const defaultPencilDrawingService = useMemo(
    () => new PencilDrawingService(),
    []
  );

  const [pencilDrawingServiceOverride, setPencilDrawingServiceOverride] = useState<PencilDrawingService | null>(
    null
  );

  const activePencilDrawingService = pencilDrawingServiceOverride ?? defaultPencilDrawingService;

  const registerPencilDrawingService = useCallback((service: PencilDrawingService) => {
    setPencilDrawingServiceOverride(service);
  }, []);

  const resetPencilDrawingService = useCallback(() => {
    setPencilDrawingServiceOverride(null);
  }, []);

  // Attach pencil drawing listeners to the service
  useEffect(() => {
    return activePencilDrawingService.attachPencilDrawingListeners(svgRef, {
      activePlugin: currentMode,
      pencil,
      style,
      viewportZoom,
      scaleStrokeWithZoom,
      screenToCanvas,
      emitPointerEvent,
      startPath,
      addPointToPath,
      finalizePath,
    });
  }, [
    activePencilDrawingService,
    svgRef,
    currentMode,
    pencil,
    style,
    viewportZoom,
    scaleStrokeWithZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
    finalizePath,
  ]);

  return {
    pencilDrawingService: activePencilDrawingService,
    registerPencilDrawingService,
    resetPencilDrawingService,
  };
}