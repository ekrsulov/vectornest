import { useEventCallback } from '../../hooks/useEventCallback';
import { useCanvasDrag } from '../hooks/useCanvasDrag';
import { useCanvasEventHandlers } from '../hooks/useCanvasEventHandlers';
import { useCanvasPointerEvents } from '../hooks/useCanvasPointerEvents';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useMobileTouchGestures } from '../hooks/useMobileTouchGestures';
import { canvasShortcutRegistry } from '../shortcuts';
import type { CanvasEventBus } from '../CanvasEventBusContext';
import type { CanvasElementEventHandlers } from '../renderers/CanvasRendererRegistry';
import type {
  CanvasElement,
  ControlPointInfo,
  Point,
  Viewport,
} from '../../types';

interface CanvasInteractionManagerProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  eventBus: CanvasEventBus;
  currentMode: string;
  isSpacePressed: boolean;
  viewport: Viewport;
  elements: CanvasElement[];
  selectedIds: string[];
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  isSelecting: boolean;
  dragSelection: {
    beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
    updateSelectionRectangle: (point: Point) => void;
    completeSelectionRectangle: () => void;
    cancelSelection: () => void;
  };
  movement: {
    moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
    moveSelectedSubpaths?: (deltaX: number, deltaY: number) => void;
    isWorkingWithSubpaths?: () => boolean;
  };
  elementCallbacks: {
    stopDraggingPoint?: () => void;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    getControlPointInfo?: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
  };
  screenToCanvas: (screenX: number, screenY: number) => Point;
  children: (state: CanvasInteractionManagerState) => React.ReactNode;
}

interface CanvasInteractionManagerState {
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
  dragPosition: Point | null;
  setDragStart: (point: Point | null) => void;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  handleElementDoubleClick: (elementId: string, e: React.MouseEvent<Element>) => void;
  handleSubpathDoubleClick: (elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => void;
  handlePointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  handleCanvasDoubleClick: (event: React.MouseEvent) => void;
  handleElementTouchEnd: (elementId: string, e: React.TouchEvent<SVGPathElement>) => void;
  handleSubpathTouchEnd: (elementId: string, subpathIndex: number, e: React.TouchEvent<SVGElement>) => void;
  handleCanvasTouchEnd: (event: React.TouchEvent<SVGSVGElement>) => void;
  /** Pre-built handlers object suitable for CanvasRenderContext.eventHandlers */
  elementEventHandlers: CanvasElementEventHandlers;
}

/**
 * Headless interaction container for pointer/touch/shortcut orchestration.
 */
export const CanvasInteractionManager: React.FC<CanvasInteractionManagerProps> = ({
  svgRef,
  eventBus,
  currentMode,
  isSpacePressed,
  viewport,
  elements,
  selectedIds,
  selectedSubpaths,
  isSelecting,
  dragSelection,
  movement,
  elementCallbacks,
  screenToCanvas,
  children,
}) => {
  useCanvasShortcuts(canvasShortcutRegistry, svgRef);
  useCanvasZoom(svgRef);
  useMobileTouchGestures(svgRef, dragSelection.cancelSelection);

  const handleMoveSelectedElements = useEventCallback((deltaX: number, deltaY: number, precisionOverride?: number) => {
    movement.moveSelectedElements(deltaX, deltaY, precisionOverride);
  });

  const handleMoveSelectedSubpaths = useEventCallback((deltaX: number, deltaY: number) => {
    movement.moveSelectedSubpaths?.(deltaX, deltaY);
  });

  const {
    isDragging,
    dragStart,
    hasDragMoved,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    stateRefs,
    helpers,
    dragPosition,
  } = useCanvasDrag({
    isSelecting,
    beginSelectionRectangle: dragSelection.beginSelectionRectangle,
    updateSelectionRectangle: dragSelection.updateSelectionRectangle,
    completeSelectionRectangle: dragSelection.completeSelectionRectangle,
    viewport,
    elements,
    callbacks: {
      onStopDraggingPoint: elementCallbacks.stopDraggingPoint ?? (() => { }),
      onUpdateElement: elementCallbacks.updateElement,
      getControlPointInfo: elementCallbacks.getControlPointInfo ?? (() => null),
    },
  });

  const { emitPointerEvent } = useCanvasPointerEvents({
    eventBus,
    currentMode,
    helpers,
    stateRefs,
    setDragStart,
    setIsDragging,
    setHasDragMoved,
  });

  const eventHandlers = useCanvasEventHandlers({
    screenToCanvas,
    isSpacePressed,
    activePlugin: currentMode,
    isSelecting,
    isDragging,
    dragStart,
    hasDragMoved,
    beginSelectionRectangle: dragSelection.beginSelectionRectangle,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isWorkingWithSubpaths: movement.isWorkingWithSubpaths ?? (() => false),
    selectedSubpaths,
    selectedIds,
    completeSelectionRectangle: dragSelection.completeSelectionRectangle,
    updateSelectionRectangle: dragSelection.updateSelectionRectangle,
    moveSelectedElements: handleMoveSelectedElements,
    moveSelectedSubpaths: handleMoveSelectedSubpaths,
    pointerStateRef: stateRefs.pointer,
  });

  return (
    <>
      {children({
        isDragging,
        dragStart,
        hasDragMoved,
        dragPosition,
        setDragStart,
        emitPointerEvent,
        handleElementDoubleClick: eventHandlers.handleElementDoubleClick,
        handleSubpathDoubleClick: eventHandlers.handleSubpathDoubleClick,
        handlePointerDown: eventHandlers.handlePointerDown,
        handlePointerMove: eventHandlers.handlePointerMove,
        handlePointerUp: eventHandlers.handlePointerUp,
        handleCanvasDoubleClick: eventHandlers.handleCanvasDoubleClick,
        handleElementTouchEnd: eventHandlers.handleElementTouchEnd,
        handleSubpathTouchEnd: eventHandlers.handleSubpathTouchEnd,
        handleCanvasTouchEnd: eventHandlers.handleCanvasTouchEnd,
        elementEventHandlers: {
          onPointerUp: undefined,
          onPointerDown: undefined,
          onDoubleClick: eventHandlers.handleElementDoubleClick,
          onTouchEnd: eventHandlers.handleElementTouchEnd as (
            elementId: string,
            event: React.TouchEvent<Element>
          ) => void,
        },
      })}
    </>
  );
};
