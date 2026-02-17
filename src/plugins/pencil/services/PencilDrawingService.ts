import type { RefObject } from 'react';
import type { Point } from '../../../types';
import type { PencilPluginSlice } from '../slice';
import type { StyleSlice } from '../../../store/slices/features/styleSlice';
import { createPathDataFromPoints, getPencilPathStyle, simplifyPathFromPoints, subPathsToPathString, type PathStyleLike } from '../utils';
import { getDefaultStrokeColorFromSettings } from '../../../utils/defaultColors';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';

type PencilStore = CanvasStore & PencilPluginSlice;
type PencilSettings = PencilPluginSlice['pencil'];
type StyleSettings = StyleSlice['style'];

type PointerEventType = 'pointermove' | 'pointerup';

export interface AttachPencilDrawingListenersOptions {
  activePlugin: string | null;
  pencil: PencilSettings;
  style: StyleSettings;
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (type: PointerEventType, event: PointerEvent, point: Point) => void;
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
}

export class PencilDrawingService {
  private detachHandlers: (() => void) | null = null;

  constructor() { }

  attachPencilDrawingListeners(
    svgRef: RefObject<SVGSVGElement | null>,
    options: AttachPencilDrawingListenersOptions
  ): () => void {
    const svgElement = svgRef.current;

    // Always cleanup any existing listeners before re-attaching
    this.detachHandlers?.();

    if (!svgElement || options.activePlugin !== 'pencil') {
      this.detachHandlers = null;
      return () => { };
    }

    // Remove orphaned temporary paths before attaching listeners
    const orphanedTempPaths = svgElement.querySelectorAll('[data-temp-path="true"]');
    orphanedTempPaths.forEach((path) => path.remove());

    let isDrawing = false;
    let tempPath: SVGPathElement | null = null;
    let allPoints: Point[] = [];
    let currentStyle: PathStyleLike | null = null;

    const cleanupTempPath = () => {
      if (tempPath && tempPath.parentNode) {
        tempPath.parentNode.removeChild(tempPath);
      }
      tempPath = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.stopPropagation();
      const point = options.screenToCanvas(event.clientX, event.clientY);

      isDrawing = true;
      allPoints = [point];
      currentStyle = getPencilPathStyle(options.style);

      tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const { strokeWidth, strokeColor, strokeOpacity } = options.style;
      const defaultStrokeColor = getDefaultStrokeColorFromSettings();
      const effectiveStrokeColor = strokeColor === 'none' ? defaultStrokeColor : strokeColor;
      const strokeWidthForZoom = options.scaleStrokeWithZoom
        ? strokeWidth
        : strokeWidth / options.viewportZoom;

      tempPath.setAttribute('fill', 'none');
      tempPath.setAttribute('stroke', effectiveStrokeColor);
      tempPath.setAttribute('stroke-width', strokeWidthForZoom.toString());
      tempPath.setAttribute('stroke-opacity', strokeOpacity.toString());
      tempPath.setAttribute('stroke-linecap', 'round');
      tempPath.setAttribute('stroke-linejoin', 'round');
      tempPath.setAttribute('d', `M ${point.x} ${point.y}`);
      tempPath.setAttribute('data-temp-path', 'true');
      tempPath.style.pointerEvents = 'none';

      svgElement.appendChild(tempPath);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = options.screenToCanvas(event.clientX, event.clientY);
      options.emitPointerEvent('pointermove', event, point);

      if (!isDrawing || !tempPath) {
        return;
      }

      event.stopPropagation();
      allPoints.push(point);

      if (!currentStyle) {
        currentStyle = getPencilPathStyle(options.style);
      }

      const tolerance = options.pencil.simplificationTolerance ?? 0;
      performance.mark('pencil-path-create-start');
      const previewPathData = tolerance > 0
        ? simplifyPathFromPoints(allPoints, currentStyle, tolerance)
        : createPathDataFromPoints(allPoints, currentStyle);
      performance.mark('pencil-path-create-end');
      performance.measure('pencil-path-create', 'pencil-path-create-start', 'pencil-path-create-end');

      const pathD = subPathsToPathString(previewPathData.subPaths);
      tempPath.setAttribute('d', pathD);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const point = options.screenToCanvas(event.clientX, event.clientY);
      options.emitPointerEvent('pointerup', event, point);

      event.stopPropagation();
      if (!isDrawing) {
        return;
      }

      isDrawing = false;
      const pointsToAdd = [...allPoints];
      allPoints = [];
      currentStyle = null;

      cleanupTempPath();

      if (pointsToAdd.length > 0) {
        options.startPath(pointsToAdd[0]);
        for (let index = 1; index < pointsToAdd.length; index++) {
          options.addPointToPath(pointsToAdd[index]);
        }

        if ((options.pencil.simplificationTolerance ?? 0) > 0) {
          options.finalizePath(pointsToAdd);
        }
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (!isDrawing) {
        return;
      }

      event.stopPropagation();
      isDrawing = false;
      allPoints = [];
      currentStyle = null;
      cleanupTempPath();
    };

    // Use centralized helper which returns a cleanup function for listeners
    this.detachHandlers = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => svgRef.current, event: 'pointerdown', handler: handlePointerDown, options: { passive: false } },
      { target: () => svgRef.current, event: 'pointermove', handler: handlePointerMove, options: { passive: false } },
      { target: () => svgRef.current, event: 'pointerup', handler: handlePointerUp, options: { passive: false } },
      { target: () => svgRef.current, event: 'pointercancel', handler: handlePointerCancel, options: { passive: false } },
    ], (s) => (s as PencilStore).activePlugin !== 'pencil');

    return this.detachHandlers || (() => { });
  }
}
