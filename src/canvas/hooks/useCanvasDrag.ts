import { useState, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { CanvasElement, SubPath, Point, ControlPointInfo, PathData } from '../../types';
import { usePointerState } from './usePointerState';
import {
    calculateDragPosition,
    updateSinglePointPath,
    updateGroupDragPaths,
    type DragSelectionState,
    type DragSubpathState
} from '../interactions/DragStrategy';
import { pluginManager } from '../../utils/pluginManager';
import { installGlobalPluginListeners, createListenerContext } from '../../utils/pluginListeners';
import { canvasStoreApi } from '../../store/canvasStore';
import { snapManager } from '../../snap/SnapManager';
import { snapStoreApi } from '../../snap/store';
import { ANIMATION_FRAME_MS } from '../../constants';
import { getActiveDragContext } from '../interactions/dragHandlerRegistry';
import { getDragPointInfo } from '../../utils/dragUtils';
import { buildElementMap } from '../../utils/elementMapUtils';

interface DragCallbacks {
    onStopDraggingPoint: () => void;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
}

interface UseCanvasDragProps {
    isSelecting: boolean;
    beginSelectionRectangle: (point: Point, shouldClearCommands?: boolean, shouldClearSubpaths?: boolean) => void;
    updateSelectionRectangle: (point: Point) => void;
    completeSelectionRectangle: () => void;
    viewport: { zoom: number; panX: number; panY: number };
    elements: Array<CanvasElement>;
    callbacks: DragCallbacks;
}

export const useCanvasDrag = ({
    isSelecting,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    viewport,
    elements,
    callbacks
}: UseCanvasDragProps) => {
    const {
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        stateRefs
    } = usePointerState({ isSelecting });

    // Memoized helpers object for event bus compatibility
    const helpers = useMemo(() => ({
        current: {
            beginSelectionRectangle,
            updateSelectionRectangle,
            completeSelectionRectangle,
            setDragStart,
            setIsDragging,
            setHasDragMoved,
        }
    }), [beginSelectionRectangle, updateSelectionRectangle, completeSelectionRectangle, setDragStart, setIsDragging, setHasDragMoved]);

    const [dragPosition, setDragPosition] = useState<Point | null>(null);
    const [originalPathDataMap, setOriginalPathDataMap] = useState<Record<string, SubPath[]> | null>(null);

    // Use refs to always have latest values in event handlers.
    // This pattern allows event handlers registered in useLayoutEffect to access
    // current values without being re-registered on every render.
    const dragContextRef = useRef<{
        dragPoint: ReturnType<typeof getDragPointInfo>;
        draggingSelection: DragSelectionState | null;
        draggingSubpaths: DragSubpathState | null;
        ctx: ReturnType<typeof getActiveDragContext> | null;
    }>({
        dragPoint: null,
        draggingSelection: null,
        draggingSubpaths: null,
        ctx: null,
    });
    const viewportRef = useRef(viewport);
    const elementsRef = useRef(elements);
    const callbacksRef = useRef(callbacks);
    const originalPathDataMapRef = useRef(originalPathDataMap);
    const elementMapRef = useRef<Map<string, CanvasElement>>(buildElementMap(elements));
    const prevElementsRef = useRef(elements);

    // Synchronize all refs in a single effect to reduce effect overhead.
    // Using useLayoutEffect ensures refs are updated before any event handlers fire.
    useLayoutEffect(() => {
        viewportRef.current = viewport;
        elementsRef.current = elements;
        // Only rebuild the element map when elements actually change
        if (elements !== prevElementsRef.current) {
            elementMapRef.current = buildElementMap(elements);
            prevElementsRef.current = elements;
        }
        callbacksRef.current = callbacks;
        originalPathDataMapRef.current = originalPathDataMap;
    }, [viewport, elements, callbacks, originalPathDataMap]);

    // Derive a stable boolean for whether any drag is active, via store subscription.
    // This avoids re-registering listeners on every viewport/elements change during drag.
    // We use a narrow subscriber that only triggers when drag-related state changes.
    const isAnyDragActive = useSyncExternalStore(
        (onStoreChange) => {
            let prev = false;
            return canvasStoreApi.subscribe((state) => {
                const ctx = getActiveDragContext(state);
                const dragPoint = getDragPointInfo(ctx);
                const meta = (ctx?.metadata ?? {}) as {
                    draggingSelection?: DragSelectionState | null;
                    draggingSubpaths?: DragSubpathState | null;
                };
                const next = Boolean(
                    ctx?.isDragging ||
                    dragPoint?.isDragging ||
                    meta.draggingSelection?.isDragging ||
                    meta.draggingSubpaths?.isDragging
                );
                if (next !== prev) {
                    prev = next;
                    onStoreChange();
                }
            });
        },
        () => {
            const ctx = getActiveDragContext(canvasStoreApi.getState());
            const dragPoint = getDragPointInfo(ctx);
            const meta = (ctx?.metadata ?? {}) as {
                draggingSelection?: DragSelectionState | null;
                draggingSubpaths?: DragSubpathState | null;
            };
            return Boolean(
                ctx?.isDragging ||
                dragPoint?.isDragging ||
                meta.draggingSelection?.isDragging ||
                meta.draggingSubpaths?.isDragging
            );
        },
        () => false
    );

    // Use useLayoutEffect to register listeners synchronously before paint
    // This prevents race conditions where pointerup fires before listeners are registered
    useLayoutEffect(() => {
        let lastUpdateTime = 0;

        const buildDragSnapshot = () => {
            const ctx = getActiveDragContext(canvasStoreApi.getState());
            const dragPoint = getDragPointInfo(ctx);
            const meta = (ctx?.metadata ?? {}) as {
                draggingSelection?: DragSelectionState | null;
                draggingSubpaths?: DragSubpathState | null;
            };

            return {
                ctx,
                dragPoint,
                draggingSelection: meta.draggingSelection ?? null,
                draggingSubpaths: meta.draggingSubpaths ?? null,
            };
        };

        const handlePointerMove = (e: MouseEvent) => {
            const snapshot = buildDragSnapshot();
            const { dragPoint, draggingSelection, draggingSubpaths, ctx: dragContext } = snapshot;

            const isDragging =
                dragContext?.isDragging ||
                dragPoint?.isDragging ||
                draggingSelection?.isDragging ||
                draggingSubpaths?.isDragging;

            if (isDragging) {
                dragContextRef.current = {
                    dragPoint,
                    draggingSelection,
                    draggingSubpaths,
                    ctx: dragContext,
                };

                const position = calculateDragPosition(e, viewportRef.current, dragContext);

                if (position) {
                    let { canvasX, canvasY } = position;

                    // Apply snap if dragging a single point
                    const editingInfo = getDragPointInfo(dragContext) ?? dragPoint;

                    if (editingInfo) {
                        const storeState = canvasStoreApi.getState();
                        const snapResult = snapManager.snap({ x: canvasX, y: canvasY }, {
                            viewport: viewportRef.current,
                            activePlugin: dragContext?.pluginId ?? 'edit',
                            dragPointInfo: {
                                elementId: editingInfo.elementId,
                                pointIndex: editingInfo.pointIndex ?? editingInfo.commandIndex ?? 0,
                                subpathIndex: editingInfo.subpathIndex ?? 0,
                                commandIndex: editingInfo.commandIndex ?? editingInfo.pointIndex ?? 0,
                            },
                            canvasSize: storeState.canvasSize,
                            selectedIds: storeState.selectedIds
                        });

                        if (snapResult) {
                            canvasX = snapResult.snappedPoint.x;
                            canvasY = snapResult.snappedPoint.y;
                            // Update snap store for overlay visualization
                            snapStoreApi.getState().setSnapResult(snapResult);
                        } else {
                            // Clear snap result when no snap is active
                            snapStoreApi.getState().clearSnapResult();
                        }
                    }

                    // Update local drag position for smooth visualization
                    setDragPosition({
                        x: canvasX,
                        y: canvasY
                    });

                    // Throttled path update for real-time feedback
                    const now = Date.now();
                    if (now - lastUpdateTime >= ANIMATION_FRAME_MS) {
                        lastUpdateTime = now;

                        if (dragPoint?.isDragging) {
                            updateSinglePointPath(
                                dragPoint,
                                canvasX,
                                canvasY,
                                elementsRef.current,
                                callbacksRef.current,
                                elementMapRef.current
                            );
                        } else if (draggingSelection?.isDragging) {
                            updateGroupDragPaths(
                                draggingSelection,
                                canvasX,
                                canvasY,
                                elementsRef.current,
                                originalPathDataMapRef.current,
                                callbacksRef.current,
                                elementMapRef.current
                            );
                        }
                    }
                }
            }
        };

        // Shared cleanup logic for drag end / cancel
        const cleanupDrag = () => {
            setDragPosition(null);
            setOriginalPathDataMap(null);

            // Clear centralized snap store
            snapStoreApi.getState().clearSnapResult();

            // Notify plugins that drag ended
            pluginManager.executeLifecycleAction('onDragEnd');

            // Force cleanup of drag state - always call to ensure cleanup
            callbacksRef.current.onStopDraggingPoint();
        };

        const handlePointerUp = () => {
            cleanupDrag();
        };

        // Emergency cleanup for cases where pointerup might not fire
        const handlePointerCancel = () => {
            cleanupDrag();
        };

        const snapshot = buildDragSnapshot();
        const isAnyDragging = snapshot.dragPoint?.isDragging ||
            snapshot.draggingSelection?.isDragging ||
            snapshot.draggingSubpaths?.isDragging ||
            snapshot.ctx?.isDragging;

        if (isAnyDragging) {
            // Initialize original path data map if needed (use refs for current values)
            if (!originalPathDataMapRef.current && snapshot.draggingSelection?.isDragging) {
                const newOriginalPathDataMap: Record<string, SubPath[]> = {};
                snapshot.draggingSelection.initialPositions.forEach(pos => {
                    const element = elementMapRef.current.get(pos.elementId);
                    if (element && element.type === 'path') {
                        const pathData = element.data as PathData;
                        newOriginalPathDataMap[pos.elementId] = pathData.subPaths;
                    }
                });
                setOriginalPathDataMap(newOriginalPathDataMap);
            }

            // Use document for more reliable event capture; register listeners via centralized helper
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    handlePointerCancel();
                }
            };
            const cleanup = installGlobalPluginListeners(createListenerContext(canvasStoreApi), [
                { target: () => document, event: 'pointermove', handler: handlePointerMove, options: { passive: false } },
                { target: () => document, event: 'pointerup', handler: () => handlePointerUp(), options: { passive: false } },
                { target: () => document, event: 'pointercancel', handler: () => handlePointerCancel(), options: { passive: false } },
                { target: () => document, event: 'contextmenu', handler: () => handlePointerCancel(), options: { passive: false } },
                { target: () => document, event: 'blur', handler: () => handlePointerCancel(), options: { passive: false } },
                { target: () => window, event: 'blur', handler: () => handlePointerCancel(), options: { passive: false } },
                { target: () => document, event: 'visibilitychange', handler: () => handleVisibilityChange() },
                { target: () => window, event: 'beforeunload', handler: () => handlePointerCancel() },
            ]);

            return cleanup;
        }
    // Only re-run when drag state transitions (active ↔ inactive).
    // Handlers access current viewport/elements/callbacks via refs,
    // so we don't need those as dependencies.
    }, [isAnyDragActive]);

    return {
        isDragging,
        dragStart,
        hasDragMoved,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
        stateRefs,
        helpers,
        dragPosition,
        originalPathDataMap
    };
};
