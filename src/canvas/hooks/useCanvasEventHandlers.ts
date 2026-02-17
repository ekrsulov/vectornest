import { useCallback } from 'react';
import type { Point } from '../../types';
import { useCanvasDoubleClickHandlers } from './useCanvasDoubleClickHandlers';
import { useCanvasTouchHandlers } from './useCanvasTouchHandlers';
import { useCanvasPointerHandlers } from './useCanvasPointerHandlers';
import { isCanvasEmptySpace } from '../utils/domUtils';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { isTouchDevice } from '../../utils/domHelpers';
import type { PointerStateSnapshot } from './usePointerState';

interface UseCanvasEventHandlersProps {
  screenToCanvas: (x: number, y: number) => Point;
  isSpacePressed: boolean;
  activePlugin: string | null;
  isSelecting: boolean;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (moved: boolean) => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  /** Optional: provide the pointer state ref from usePointerState to avoid duplicate tracking */
  pointerStateRef?: React.RefObject<PointerStateSnapshot>;
}

/**
 * Main hook for canvas event handlers
 * Composes multiple focused hooks for double-click, touch, and pointer events
 */
export const useCanvasEventHandlers = (props: UseCanvasEventHandlersProps) => {
  const { activePlugin } = props;
  const eventBus = useCanvasEventBus();

  // Desktop double-click handlers
  const doubleClickHandlers = useCanvasDoubleClickHandlers({ activePlugin });

  // Mobile touch handlers (uses double-click handlers internally)
  const touchHandlers = useCanvasTouchHandlers({
    activePlugin,
    handleElementDoubleClick: doubleClickHandlers.handleElementDoubleClick,
    handleSubpathDoubleClick: doubleClickHandlers.handleSubpathDoubleClick,
  });

  // Pointer event handlers
  const pointerHandlers = useCanvasPointerHandlers({
    screenToCanvas: props.screenToCanvas,
    isSpacePressed: props.isSpacePressed,
    activePlugin,
    isSelecting: props.isSelecting,
    isDragging: props.isDragging,
    dragStart: props.dragStart,
    hasDragMoved: props.hasDragMoved,
    beginSelectionRectangle: props.beginSelectionRectangle,
    setIsDragging: props.setIsDragging,
    setDragStart: props.setDragStart,
    setHasDragMoved: props.setHasDragMoved,
    moveSelectedElements: props.moveSelectedElements,
    moveSelectedSubpaths: props.moveSelectedSubpaths,
    isWorkingWithSubpaths: props.isWorkingWithSubpaths,
    selectedSubpaths: props.selectedSubpaths,
    selectedIds: props.selectedIds,
    completeSelectionRectangle: props.completeSelectionRectangle,
    updateSelectionRectangle: props.updateSelectionRectangle,
    pointerStateRef: props.pointerStateRef,
  });

  // Handle double click on empty canvas to return to select mode
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    // Skip handling on touch devices to avoid conflicts with custom double-tap detection
    if (isTouchDevice()) {
      return;
    }

    // Only handle double click if we clicked on empty space
    if (isCanvasEmptySpace(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      eventBus.emit('canvasDoubleClick', {
        event: e,
        activePlugin
      });
    }
  }, [activePlugin, eventBus]);

  return {
    // Desktop double-click handlers
    handleElementDoubleClick: doubleClickHandlers.handleElementDoubleClick,
    handleSubpathDoubleClick: doubleClickHandlers.handleSubpathDoubleClick,
    handleCanvasDoubleClick,

    // Pointer handlers
    handlePointerDown: pointerHandlers.handlePointerDown,
    handlePointerMove: pointerHandlers.handlePointerMove,
    handlePointerUp: pointerHandlers.handlePointerUp,

    // Touch handlers
    handleElementTouchEnd: touchHandlers.handleElementTouchEnd,
    handleSubpathTouchEnd: touchHandlers.handleSubpathTouchEnd,
    handleCanvasTouchEnd: touchHandlers.handleCanvasTouchEnd,
  };
};
