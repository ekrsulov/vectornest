import { useCallback, useEffect, useMemo, useRef } from 'react';
import { canvasStoreApi } from '../../store/canvasStore';
import type { Point } from '../../types';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import {
    buildPointerEventPayload,
    createPointerEventHelpers,
    createPointerEventState,
} from '../utils/pointerEventUtils';
import { pluginManager } from '../../utils/pluginManager';
import { DEFAULT_MODE, DRAG_THRESHOLD_PX } from '../../constants';
import type { PointerStateSnapshot } from './usePointerState';

export interface CanvasPointerHandlersProps {
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

export interface CanvasPointerHandlers {
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
}

/**
 * Hook for handling pointer events (down, move, up) on the canvas
 */
export const useCanvasPointerHandlers = (
    props: CanvasPointerHandlersProps
): CanvasPointerHandlers => {
    const {
        screenToCanvas,
        isSpacePressed,
        activePlugin,
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved,
        beginSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        moveSelectedElements,
        moveSelectedSubpaths,
        isWorkingWithSubpaths,
        selectedSubpaths,
        selectedIds,
        completeSelectionRectangle,
        updateSelectionRectangle,
    } = props;

    const eventBus = useCanvasEventBus();

    // Use shared pointer state ref if provided, otherwise create a local one (backward compat)
    const localPointerStateRef = useRef<PointerStateSnapshot>({
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved,
    });
    const pointerStateRef = props.pointerStateRef ?? localPointerStateRef;

    const selectionStateRef = useRef({
        selectedSubpaths,
        selectedIds,
    });

    useEffect(() => {
        // Only sync local ref; if external ref is used, it's managed by usePointerState
        if (!props.pointerStateRef) {
            localPointerStateRef.current = {
                isSelecting,
                isDragging,
                dragStart,
                hasDragMoved,
            };
        }
    }, [isSelecting, isDragging, dragStart, hasDragMoved, props.pointerStateRef]);

    useEffect(() => {
        selectionStateRef.current = {
            selectedSubpaths,
            selectedIds,
        };
    }, [selectedSubpaths, selectedIds]);

    // Create memoized helpers and state builders
    const helpers = useMemo(() => createPointerEventHelpers({
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
    }), [beginSelectionRectangle, updateSelectionRectangle, completeSelectionRectangle, setIsDragging, setDragStart, setHasDragMoved]);

    // Handle pointer down
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        if (isSpacePressed || pluginManager.isInPanMode()) {
            return;
        }

        const state = createPointerEventState(pointerStateRef.current);
        eventBus.emit('pointerdown', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));
    }, [
        activePlugin,
        screenToCanvas,
        isSpacePressed,
        eventBus,
        helpers,
        pointerStateRef,
    ]);

    // --- Pointer-move sub-handlers ---

    /** Pan the canvas when spacebar is held and a pointer button is pressed. */
    const handleSpacebarPan = useCallback((e: React.PointerEvent): boolean => {
        if (!(isSpacePressed && e.buttons === 1)) return false;
        canvasStoreApi.getState().pan(e.movementX, e.movementY);
        return true;
    }, [isSpacePressed]);

    /** Initiate dragging once the pointer exceeds the threshold. */
    const initiateDragIfNeeded = useCallback((
        currentIsDragging: boolean,
        deltaX: number,
        deltaY: number,
    ): boolean => {
        const shouldStart = !currentIsDragging
            && (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX);
        const shouldContinue = currentIsDragging
            && (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001);

        if (!shouldStart && !shouldContinue) return false;

        if (!currentIsDragging) {
            setIsDragging(true);
            pointerStateRef.current.isDragging = true;
            canvasStoreApi.getState().setIsDraggingElements(true);
        }
        setHasDragMoved(true);
        pointerStateRef.current.hasDragMoved = true;
        return true;
    }, [setIsDragging, setHasDragMoved, pointerStateRef]);

    /** Drag selected subpaths by delta when in subpath mode. Returns true if handled. */
    const handleSubpathDrag = useCallback((
        deltaX: number,
        deltaY: number,
        point: Point,
    ): boolean => {
        if (!isWorkingWithSubpaths() || activePlugin === DEFAULT_MODE) return false;
        const subs = selectionStateRef.current.selectedSubpaths;
        if (subs.length === 0) return false;

        moveSelectedSubpaths(deltaX, deltaY);
        setDragStart(point);
        pointerStateRef.current.dragStart = point;
        return true;
    }, [activePlugin, isWorkingWithSubpaths, moveSelectedSubpaths, setDragStart, pointerStateRef]);

    /** Apply plugin drag modifiers then move selected elements. */
    const handleElementDrag = useCallback((
        rawDeltaX: number,
        rawDeltaY: number,
        point: Point,
    ) => {
        let deltaX = rawDeltaX;
        let deltaY = rawDeltaY;
        const elementDragModifiers = pluginManager.getElementDragModifiers();
        const viewport = canvasStoreApi.getState().viewport;
        const dragContext = {
            selectedIds: selectionStateRef.current.selectedIds,
            originalDelta: { x: deltaX, y: deltaY },
            viewport,
        };

        for (const modifier of elementDragModifiers) {
            const result = modifier.modify(deltaX, deltaY, dragContext);
            if (result.applied) {
                deltaX = result.deltaX;
                deltaY = result.deltaY;
            }
        }

        moveSelectedElements(deltaX, deltaY, 3);
        setDragStart(point);
        pointerStateRef.current.dragStart = point;
    }, [moveSelectedElements, setDragStart, pointerStateRef]);

    // Handle pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        const stateSnapshot = pointerStateRef.current;
        const state = createPointerEventState(stateSnapshot);
        eventBus.emit('pointermove', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));

        // 1) Spacebar pan
        if (handleSpacebarPan(e)) return;

        const { dragStart: currentDragStart, isSelecting: currentIsSelecting, isDragging: currentIsDragging } = stateSnapshot;

        // 2) Element / subpath dragging
        if (currentDragStart && !currentIsSelecting) {
            const deltaX = point.x - currentDragStart.x;
            const deltaY = point.y - currentDragStart.y;

            if (initiateDragIfNeeded(currentIsDragging, deltaX, deltaY)) {
                if (!handleSubpathDrag(deltaX, deltaY, point)) {
                    handleElementDrag(deltaX, deltaY, point);
                }
            }
            return;
        }

        // 3) Selection rectangle
        if (currentIsSelecting) {
            updateSelectionRectangle(point);
        }
    }, [
        activePlugin,
        screenToCanvas,
        handleSpacebarPan,
        initiateDragIfNeeded,
        handleSubpathDrag,
        handleElementDrag,
        updateSelectionRectangle,
        helpers,
        eventBus,
        pointerStateRef,
    ]);

    // Handle pointer up
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        const point = screenToCanvas(e.clientX, e.clientY);
        const target = (e.target as Element) ?? null;

        const stateSnapshot = pointerStateRef.current;
        const state = createPointerEventState(stateSnapshot);
        eventBus.emit('pointerup', buildPointerEventPayload({
            event: e,
            point,
            target,
            activePlugin,
            helpers,
            state,
        }));

        // Only handle dragging if it hasn't been handled by element click already
        if (stateSnapshot.isDragging) {
            setIsDragging(false);
            pointerStateRef.current.isDragging = false;

            // Call onDragEnd on all element drag modifiers
            const elementDragModifiers = pluginManager.getElementDragModifiers();
            for (const modifier of elementDragModifiers) {
                modifier.onDragEnd?.();
            }

            // Notify plugins that element drag ended (for cache invalidation, etc.)
            pluginManager.executeLifecycleAction('onDragEnd');
        }

        // Always clear global flag on pointer up
        canvasStoreApi.getState().setIsDraggingElements(false);

        setDragStart(null);
        pointerStateRef.current.dragStart = null;
        setHasDragMoved(false);
        pointerStateRef.current.hasDragMoved = false;

        if (stateSnapshot.isSelecting) {
            completeSelectionRectangle();
        }
    }, [
        activePlugin,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        completeSelectionRectangle,
        screenToCanvas,
        helpers,
        eventBus,
        pointerStateRef,
    ]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
};
