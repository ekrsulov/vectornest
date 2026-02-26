/**
 * useGizmoDrag — Shared drag hook for native-shape gizmo handles.
 *
 * Installs window-level pointermove / pointerup listeners on pointerdown so that
 * dragging works even when the cursor leaves the SVG canvas.
 */

import { useCallback, useRef } from 'react';
import type { Point, Viewport } from '../../../types';

export interface GizmoDragCallbacks {
  /** Called on every pointer move while dragging. */
  onDrag: (canvasPoint: Point, startPoint: Point, delta: Point) => void;
  /** Called once when the drag ends. */
  onDragEnd?: () => void;
}

export interface GizmoDragOptions {
  /** Optional mapper from world-canvas coordinates into the gizmo's editing space. */
  pointTransform?: (canvasPoint: Point) => Point;
}

/**
 * Returns a `handlePointerDown` that should be spread onto the SVG handle element.
 * Internally tracks the drag lifecycle via window events.
 */
export function useGizmoDrag(
  viewport: Viewport,
  callbacks: GizmoDragCallbacks,
  options: GizmoDragOptions = {},
) {
  const draggingRef = useRef(false);
  const startScreenRef = useRef<Point>({ x: 0, y: 0 });
  const startCanvasRef = useRef<Point>({ x: 0, y: 0 });
  const pointTransform = options.pointTransform;

  const screenToCanvas = useCallback(
    (sx: number, sy: number): Point => {
      const svg = document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null;
      const rect = svg?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return {
        x: (sx - rect.left - viewport.panX) / viewport.zoom,
        y: (sy - rect.top - viewport.panY) / viewport.zoom,
      };
    },
    [viewport.panX, viewport.panY, viewport.zoom],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = true;
      startScreenRef.current = { x: e.clientX, y: e.clientY };
      const startCanvas = screenToCanvas(e.clientX, e.clientY);
      startCanvasRef.current = pointTransform ? pointTransform(startCanvas) : startCanvas;

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        const currentCanvas = screenToCanvas(ev.clientX, ev.clientY);
        const current = pointTransform ? pointTransform(currentCanvas) : currentCanvas;
        const delta: Point = {
          x: current.x - startCanvasRef.current.x,
          y: current.y - startCanvasRef.current.y,
        };
        callbacks.onDrag(current, startCanvasRef.current, delta);
      };

      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        callbacks.onDragEnd?.();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [screenToCanvas, callbacks, pointTransform],
  );

  return { handlePointerDown };
}
