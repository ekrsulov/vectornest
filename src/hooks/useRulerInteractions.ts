import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createListenerContext, installGlobalPluginListeners } from '../utils/pluginListeners';
import { useCanvasStore } from '../store/canvasStore';

export interface RulerViewport {
  zoom: number;
  panX: number;
  panY: number;
}

interface UseRulerInteractionsOptions {
  interactive: boolean;
  viewport: RulerViewport;
  rulerSize: number;
  onHorizontalDragStart?: (canvasY: number) => void;
  onVerticalDragStart?: (canvasX: number) => void;
  onDragUpdate?: (position: number) => void;
  onDragEnd?: () => void;
}

interface UseRulerInteractionsResult {
  handleHorizontalPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleVerticalPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

type DragAxis = 'x' | 'y';

export function useRulerInteractions({
  interactive,
  viewport,
  rulerSize,
  onHorizontalDragStart,
  onVerticalDragStart,
  onDragUpdate,
  onDragEnd,
}: UseRulerInteractionsOptions): UseRulerInteractionsResult {
  // Use a ref for viewport to avoid recreating handlers on every pan/zoom change.
  // The ref is read at pointer-down time, so the captured values are still correct.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const createPointerHandler = useCallback((
    axis: DragAxis,
    onStart?: (position: number) => void
  ) => {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive || !onStart) {
        return;
      }

      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);

      const vp = viewportRef.current;
      const rect = target.getBoundingClientRect();
      const canvasOriginScreen = axis === 'y'
        ? rect.top + rulerSize
        : rect.left + rulerSize;

      const clientCoord = axis === 'y' ? event.clientY : event.clientX;
      const pan = axis === 'y' ? vp.panY : vp.panX;
      const initialCanvasCoord = (clientCoord - canvasOriginScreen - pan) / vp.zoom;
      onStart(initialCanvasCoord);

      const handlePointerMove = (moveEvent: PointerEvent): void => {
        const moveCoord = axis === 'y' ? moveEvent.clientY : moveEvent.clientX;
        const canvasCoord = (moveCoord - canvasOriginScreen - pan) / vp.zoom;
        onDragUpdate?.(canvasCoord);
      };

      const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
        {
          target: () => document,
          event: 'pointermove',
          handler: (nativeEvent: Event) => handlePointerMove(nativeEvent as PointerEvent),
        },
        {
          target: () => document,
          event: 'pointerup',
          handler: (nativeEvent: Event) => {
            const upEvent = nativeEvent as PointerEvent;
            if (target.hasPointerCapture(upEvent.pointerId)) {
              target.releasePointerCapture(upEvent.pointerId);
            }
            onDragEnd?.();
            try {
              cleanup();
            } catch {
              // Ignore listener cleanup errors.
            }
          },
        },
        {
          target: () => document,
          event: 'pointercancel',
          handler: (nativeEvent: Event) => {
            const upEvent = nativeEvent as PointerEvent;
            if (target.hasPointerCapture(upEvent.pointerId)) {
              target.releasePointerCapture(upEvent.pointerId);
            }
            onDragEnd?.();
            try {
              cleanup();
            } catch {
              // Ignore listener cleanup errors.
            }
          },
        },
      ]);
    };
  }, [interactive, onDragEnd, onDragUpdate, rulerSize]);

  const handleHorizontalPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      createPointerHandler('y', onHorizontalDragStart)(event);
    },
    [createPointerHandler, onHorizontalDragStart]
  );

  const handleVerticalPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      createPointerHandler('x', onVerticalDragStart)(event);
    },
    [createPointerHandler, onVerticalDragStart]
  );

  return {
    handleHorizontalPointerDown,
    handleVerticalPointerDown,
  };
}
