import type { Point } from '../../types';
import type {
  CanvasPointerEventHelpers,
  CanvasPointerEventPayload,
  CanvasPointerEventState,
} from '../CanvasEventBusContext';

export interface PointerEventPayloadParams {
  event: React.PointerEvent | PointerEvent;
  point: Point;
  target: EventTarget | null;
  activePlugin: string | null;
  helpers: CanvasPointerEventHelpers;
  state: CanvasPointerEventState;
}

/**
 * Builds a standardized pointer event payload for the Canvas Event Bus.
 * This eliminates duplication between Canvas.tsx and useCanvasPointerHandlers.ts
 */
export function buildPointerEventPayload(params: PointerEventPayloadParams): CanvasPointerEventPayload {
  return {
    event: params.event,
    point: params.point,
    target: params.target,
    activePlugin: params.activePlugin,
    helpers: params.helpers,
    state: params.state,
  };
}

/**
 * Creates a helpers object for pointer event payloads
 */
export function createPointerEventHelpers(deps: {
  beginSelectionRectangle?: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  updateSelectionRectangle?: (point: Point) => void;
  completeSelectionRectangle?: () => void;
  setDragStart?: (point: Point | null) => void;
  setIsDragging?: (isDragging: boolean) => void;
  setHasDragMoved?: (hasMoved: boolean) => void;
}): CanvasPointerEventHelpers {
  return {
    beginSelectionRectangle: deps.beginSelectionRectangle,
    updateSelectionRectangle: deps.updateSelectionRectangle,
    completeSelectionRectangle: deps.completeSelectionRectangle,
    setDragStart: deps.setDragStart,
    setIsDragging: deps.setIsDragging,
    setHasDragMoved: deps.setHasDragMoved,
  };
}

/**
 * Creates a state snapshot for pointer event payloads
 */
export function createPointerEventState(deps: {
  isSelecting: boolean;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
}): CanvasPointerEventState {
  return {
    isSelecting: deps.isSelecting,
    isDragging: deps.isDragging,
    dragStart: deps.dragStart,
    hasDragMoved: deps.hasDragMoved,
  };
}
