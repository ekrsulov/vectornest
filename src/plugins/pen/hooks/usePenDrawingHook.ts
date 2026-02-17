import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import type { CanvasStore } from '../../../store/canvasStore';
import type { Point } from '../../../types';
import type { PenPluginSlice } from '../slice';
import type { PenCursorState } from '../types';

type PenStore = CanvasStore & PenPluginSlice;
import type { PathData } from '../../../types';
import {
    startPath,
    addStraightAnchor,
    addCurvedAnchor,
    closePath,
    finalizePath,
    cancelPath,
    startEditingPath,
    addAnchorToSegment,
    deleteAnchor,
    convertAnchorType,
    continueFromEndpoint,
    updateHandle,
    moveLastAnchor,
    moveAnchor,
    curveSegment,
    translateSegment,
    savePathToHistory
} from '../actions';
import { pathDataToPenPath } from '../utils/pathConverter';
import { calculateCursorState, calculateEditCursorState } from '../utils/cursorState';
import { constrainAngleTo45Degrees } from '../utils/pathConverter';
import { findPathAtPoint, findSegmentOnPath } from '../utils/anchorDetection';
import { applyGridSnap } from '../../../utils/gridSnapUtils';
import { getEffectiveShift } from '../../../utils/effectiveShift';
import {
    collectReferencePoints,
    findPenGuidelines,
    applyPenGuidelineSnap,
    type ReferencePoint
} from '../utils/penGuidelines';
import type { PenHoverTarget, PenPath } from '../types';
import { snapManager } from '../../../snap/SnapManager';

/**
 * Main hook for Pen tool pointer event handling
 */
export function usePenDrawingHook(context: PluginHooksContext): void {
    const { svgRef, screenToCanvas, activePlugin, viewportZoom } = context;

    // Use refs for state that needs to persist across renders but doesn't trigger re-renders
    const isDraggingRef = useRef(false);
    const dragStartPointRef = useRef<Point | null>(null);
    const rawDragStartPointRef = useRef<Point | null>(null); // Raw position without snap for drag detection
    const isShiftPressedRef = useRef(false);
    const isAltPressedRef = useRef(false);
    const savedInHandleRef = useRef<Point | null>(null);
    const isVKeyPressedRef = useRef(false);
    const isMovingLastAnchorRef = useRef(false);
    const lastAnchorOriginalPositionRef = useRef<Point | null>(null);

    // Reference for segment translation: stores original anchor positions when drag starts
    const segmentOriginalAnchorsRef = useRef<{ start: Point; end: Point } | null>(null);

    // Guidelines reference points cache
    const referencePointsRef = useRef<ReferencePoint[]>([]);
    const lastReferenceUpdateRef = useRef<number>(0);
    const lastAnchorCountRef = useRef<number>(0); // Track anchor count to invalidate cache

    // Only activate when pen tool is active
    const isActive = activePlugin === 'pen';

    // Reset pen state when tool becomes active (cleanup from previous session)
    useEffect(() => {
        if (isActive) {
            const state = useCanvasStore.getState() as PenStore;
            const penState = state.pen;

            // Only reset if there's stale state from a previous session
            if (penState?.currentPath || penState?.mode === 'drawing') {
                state.updatePenState?.({
                    mode: 'idle',
                    currentPath: null,
                    activeAnchorIndex: null,
                    previewAnchor: null,
                    dragState: null,
                    cursorState: 'new-path',
                    editingPathId: null,
                    selectedAnchorIndex: null,
                });

                // Also reset local refs
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                rawDragStartPointRef.current = null;
                isShiftPressedRef.current = false;
                isAltPressedRef.current = false;
                savedInHandleRef.current = null;
                isVKeyPressedRef.current = false;
                isMovingLastAnchorRef.current = false;
                lastAnchorOriginalPositionRef.current = null;
                segmentOriginalAnchorsRef.current = null;
            }
        }
    }, [isActive]);

    // Sync currentPath with element when in editing mode and element changes (undo/redo)
    useEffect(() => {
        if (!isActive) return;

        // Track previous elements to detect changes
        let prevElements = useCanvasStore.getState().elements;

        // Subscribe to state changes to detect undo/redo
        const unsubscribe = useCanvasStore.subscribe((state) => {
            const elements = state.elements;

            // Skip if elements haven't changed
            if (elements === prevElements) return;
            prevElements = elements;

            const penState = (state as unknown as PenStore).pen;

            // Only sync when in editing mode with an active editingPathId
            if (penState?.mode === 'editing' && penState.editingPathId && penState.editingSubPathIndex !== null) {
                const editingElement = elements.find(el => el.id === penState.editingPathId);

                if (editingElement && editingElement.type === 'path') {
                    const pathData = editingElement.data as PathData;
                    // Check if the specific subpath exists
                    if (pathData.subPaths?.[penState.editingSubPathIndex]) {
                        // Convert element to PenPath
                        const updatedPenPath = pathDataToPenPath(
                            pathData.subPaths[penState.editingSubPathIndex],
                            penState.editingPathId
                        );

                        // Only update if the path data actually changed
                        // Compare anchor positions and handles
                        const currentPath = penState.currentPath;
                        if (currentPath) {
                            const isDifferent =
                                updatedPenPath.anchors.length !== currentPath.anchors.length ||
                                updatedPenPath.anchors.some((anchor, i) => {
                                    const curr = currentPath.anchors[i];
                                    if (!curr) return true;
                                    if (anchor.position.x !== curr.position.x || anchor.position.y !== curr.position.y) return true;
                                    if (anchor.inHandle?.x !== curr.inHandle?.x || anchor.inHandle?.y !== curr.inHandle?.y) return true;
                                    if (anchor.outHandle?.x !== curr.outHandle?.x || anchor.outHandle?.y !== curr.outHandle?.y) return true;
                                    return false;
                                });

                            if (isDifferent) {
                                // Sync the currentPath with the element
                                state.updatePenState?.({
                                    currentPath: updatedPenPath,
                                    // Reset selection if anchor index is out of bounds
                                    selectedAnchorIndex: penState.selectedAnchorIndex !== null &&
                                        penState.selectedAnchorIndex >= updatedPenPath.anchors.length
                                        ? null
                                        : penState.selectedAnchorIndex,
                                    activeAnchorIndex: penState.activeAnchorIndex !== null &&
                                        penState.activeAnchorIndex >= updatedPenPath.anchors.length
                                        ? null
                                        : penState.activeAnchorIndex,
                                });
                            }
                        }
                    }
                } else if (!editingElement) {
                    // Element was deleted - exit editing mode
                    state.updatePenState?.({
                        mode: 'idle',
                        currentPath: null,
                        editingPathId: null,
                        editingSubPathIndex: null,
                        selectedAnchorIndex: null,
                        activeAnchorIndex: null,
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [isActive]);

    useEffect(() => {

        if (!isActive) return;


        /**
         * Handle pointer down - start new anchor or operation
         */
        const handlePointerDown = (event: PointerEvent) => {

            if (!svgRef.current || event.button !== 0) return; // Only left button

            // Check if the click is actually on the SVG canvas (not on UI elements)
            const target = event.target as HTMLElement;
            const svgElement = svgRef.current;

            // Ignore clicks that are not on the SVG or its children
            if (!svgElement.contains(target)) {
                return;
            }

            // screenToCanvas already handles getBoundingClientRect internally
            const rawCanvasPoint = screenToCanvas(
                event.clientX,
                event.clientY
            );

            const state = useCanvasStore.getState() as PenStore;
            const penState = state.pen;

            if (!penState) return;

            // Apply snapping for actions (drawing/dragging)
            // We exclude the current path being drawn/edited from object snap to avoid self-snapping issues during creation
            // although sometimes self-snapping is desired (e.g. closing path).
            // For now, let's exclude nothing and see if it works, or exclude editingPathId.
            // Actually, closing path is handled by specific logic, so we might want to exclude current path.
            const excludeIds = penState.editingPathId ? [penState.editingPathId] : [];

            // Helper to apply snapping using centralized SnapManager
            const getSnappedPoint = (point: Point) => {
                let finalPoint = point;
                let snapped = false;

                // 1. Object Snap via SnapManager
                const snapContext = {
                    viewport: state.viewport,
                    canvasSize: { width: 0, height: 0 },
                    activePlugin: 'pen',
                    selectedIds: excludeIds,
                };
                const result = snapManager.snap(point, snapContext);
                if (result && result.snapPoints.length > 0) {
                    finalPoint = result.snappedPoint;
                    snapped = true;
                }

                // 2. Grid Snap (only if not snapped to object)
                if (!snapped) {
                    finalPoint = applyGridSnap(point);
                }
                return finalPoint;
            };

            const canvasPoint = getSnappedPoint(rawCanvasPoint);
            // Use raw point for detection to avoid snapping away from targets
            const detectionPoint = rawCanvasPoint;

            const { mode, currentPath, cursorState, guidelinesEnabled } = penState;

            // Calculate guidelines snap directly for the current point
            // This is necessary because on touch devices, there's no pointerMove before pointerDown,
            // so activeGuidelines from state may be stale (from a previous touch position).
            // We recalculate guidelines here to ensure correct snap behavior on touch devices.
            let finalCanvasPoint = canvasPoint;
            
            if (guidelinesEnabled) {
                // Collect reference points for guidelines
                const viewportInfo = {
                    zoom: state.viewport.zoom,
                    panX: state.viewport.panX,
                    panY: state.viewport.panY,
                    width: window.innerWidth,
                    height: window.innerHeight,
                };
                const referencePoints = collectReferencePoints(
                    currentPath,
                    null, // Don't exclude any point when creating new anchor
                    state.elements,
                    viewportInfo,
                    penState.editingPathId
                );
                
                // Find matching guidelines for the current point
                const threshold = 8 / state.viewport.zoom;
                const guidelines = findPenGuidelines(canvasPoint, referencePoints, threshold);
                
                // Apply snap if guidelines are found
                if (guidelines.horizontal || guidelines.vertical) {
                    finalCanvasPoint = applyPenGuidelineSnap(canvasPoint, guidelines.horizontal, guidelines.vertical);
                    // Update state so the overlay renders correctly
                    state.updatePenState?.({ activeGuidelines: guidelines });
                } else {
                    // Clear guidelines if none found
                    state.updatePenState?.({ activeGuidelines: null });
                }
            }


            // Store modifier keys
            isShiftPressedRef.current = event.shiftKey;
            isAltPressedRef.current = event.altKey;

            // Handle based on cursor state
            if (cursorState === 'close' && mode === 'drawing') {
                // Closing the path
                closePath(useCanvasStore.getState);
                return;
            }

            // Handle editing actions based on cursor state
            if (mode === 'editing' || mode === 'idle') {
                let clickResult: { pathId: string; penPath: PenPath; subPathIndex: number } | null = null;
                let hoverTarget: PenHoverTarget = { type: 'none' };

                // If editing a specific path, check it first (regardless of distance)
                if (penState.editingPathId && penState.currentPath) {
                    const result = calculateEditCursorState(
                        detectionPoint,
                        penState.currentPath,
                        penState.editingPathId,
                        penState.editingSubPathIndex ?? 0,
                        penState.autoAddDelete,
                        viewportZoom
                    );
                    hoverTarget = result.hoverTarget;
                    if (hoverTarget.type !== 'none') {
                        // Found something on the current path
                        clickResult = {
                            pathId: penState.editingPathId,
                            subPathIndex: penState.editingSubPathIndex ?? 0,
                            penPath: penState.currentPath
                        };
                    }
                }

                // If nothing found on current path, check other paths
                if (hoverTarget.type === 'none') {
                    const result = findPathAtPoint(detectionPoint, state.elements, viewportZoom);
                    if (result) {
                        clickResult = result;
                        const editResult = calculateEditCursorState(
                            detectionPoint,
                            result.penPath,
                            result.pathId,
                            result.subPathIndex,
                            penState.autoAddDelete,
                            viewportZoom
                        );
                        hoverTarget = editResult.hoverTarget;
                    }
                }

                if (clickResult) {
                    // If we're already editing this exact path and subpath, handle actions on it
                    if (penState.editingPathId === clickResult.pathId && penState.editingSubPathIndex === clickResult.subPathIndex) {
                        // Handle direct handle manipulation
                        if (hoverTarget.type === 'handle' && hoverTarget.anchorIndex !== undefined && hoverTarget.handleType) {
                            // Start dragging the handle
                            isDraggingRef.current = true;
                            dragStartPointRef.current = { ...canvasPoint }; // Use snapped point for drag start
                            state.updatePenState?.({
                                dragState: {
                                    type: 'handle',
                                    anchorIndex: hoverTarget.anchorIndex,
                                    handleType: hoverTarget.handleType,
                                    startPoint: canvasPoint,
                                    currentPoint: canvasPoint,
                                },
                            });
                            return;
                        }

                        if (hoverTarget.type === 'anchor' && hoverTarget.anchorIndex !== undefined) {
                            if (isAltPressedRef.current) {
                                // Cycle anchor type
                                convertAnchorType(hoverTarget.anchorIndex, useCanvasStore.getState);
                            } else if (penState.autoAddDelete) {
                                // Delete anchor
                                deleteAnchor(hoverTarget.anchorIndex, useCanvasStore.getState);
                            } else {
                                // Auto Add/Delete disabled: start dragging anchor
                                isDraggingRef.current = true;
                                dragStartPointRef.current = { ...canvasPoint };
                                state.updatePenState?.({
                                    dragState: {
                                        type: 'anchor',
                                        anchorIndex: hoverTarget.anchorIndex,
                                        startPoint: canvasPoint,
                                        currentPoint: canvasPoint,
                                    },
                                });
                            }
                            return;
                        }

                        if (hoverTarget.type === 'segment' && hoverTarget.segmentIndex !== undefined) {
                            if (penState.autoAddDelete) {
                                // Add anchor - use snapped point for new anchor position
                                addAnchorToSegment(hoverTarget.segmentIndex, canvasPoint, useCanvasStore.getState);
                                return;
                            } else {
                                // Auto Add/Delete disabled: start curving/translating segment
                                // Need to find the segment again to get the 't' parameter
                                if (!penState.currentPath) return;
                                const result = findSegmentOnPath(detectionPoint, penState.currentPath, 8 / viewportZoom);
                                if (result) {
                                    isDraggingRef.current = true;
                                    dragStartPointRef.current = { ...canvasPoint };

                                    // Save original anchor positions for segment translation (Shift+drag)
                                    const anchors = penState.currentPath.anchors;
                                    const startIndex = result.segmentIndex;
                                    const endIndex = (result.segmentIndex + 1) % anchors.length;
                                    segmentOriginalAnchorsRef.current = {
                                        start: { ...anchors[startIndex].position },
                                        end: { ...anchors[endIndex].position },
                                    };

                                    state.updatePenState?.({
                                        dragState: {
                                            type: 'segment',
                                            segmentIndex: result.segmentIndex,
                                            t: result.t,
                                            startPoint: canvasPoint,
                                            currentPoint: canvasPoint,
                                        },
                                    });
                                }
                                return;
                            }
                        }

                        if (hoverTarget.type === 'endpoint' && hoverTarget.anchorIndex !== undefined && hoverTarget.pathId) {
                            // Continue path
                            continueFromEndpoint(hoverTarget.pathId, hoverTarget.anchorIndex, useCanvasStore.getState, hoverTarget.subPathIndex);
                            return;
                        }
                    } else {
                        // Either different path or different subpath of same path - start editing the clicked one
                        startEditingPath(clickResult.pathId, useCanvasStore.getState, clickResult.subPathIndex);
                        return;
                    }
                } else if (mode === 'editing') {
                    // Clicked on empty space while editing -> stop editing / start new path?
                    // Usually tools allow starting new path.
                    // Let's finalize editing (which just means deselecting/clearing state)
                    // and start new path.
                    cancelPath(useCanvasStore.getState); // Clears editing state
                    // Fall through to start new path
                }
            }

            if (mode === 'idle' || !currentPath) {
                // Start new path - use finalCanvasPoint which respects guidelines snap
                startPath(finalCanvasPoint, useCanvasStore.getState);
                dragStartPointRef.current = { ...finalCanvasPoint };
                rawDragStartPointRef.current = { ...rawCanvasPoint }; // Store raw for drag detection
                isDraggingRef.current = true;
                savedInHandleRef.current = null;
                return;
            }

            if (mode === 'drawing') {
                // Continue path - prepare for drag using finalCanvasPoint
                dragStartPointRef.current = { ...finalCanvasPoint };
                rawDragStartPointRef.current = { ...rawCanvasPoint }; // Store raw for drag detection
                isDraggingRef.current = true;
                savedInHandleRef.current = null;
            }
        };

        /**
         * Handle pointer move - update preview or drag handles
         */
        const handlePointerMove = (event: PointerEvent) => {
            if (!svgRef.current) return;

            // screenToCanvas already handles getBoundingClientRect internally
            const rawCanvasPoint = screenToCanvas(
                event.clientX,
                event.clientY
            );

            const state = useCanvasStore.getState() as PenStore;
            const penState = state.pen;

            if (!penState) return;

            const { mode, currentPath, rubberBandEnabled, guidelinesEnabled } = penState;
            const viewportZoom = state.viewport.zoom;

            // Apply snapping
            const excludeIds = penState.editingPathId ? [penState.editingPathId] : [];

            // Helper to apply snapping using centralized SnapManager
            const getSnappedPoint = (point: Point) => {
                let finalPoint = point;
                let snapped = false;

                // 1. Object Snap via SnapManager
                const snapContext = {
                    viewport: state.viewport,
                    canvasSize: { width: 0, height: 0 },
                    activePlugin: 'pen',
                    selectedIds: excludeIds,
                };
                const result = snapManager.snap(point, snapContext);
                if (result && result.snapPoints.length > 0) {
                    finalPoint = result.snappedPoint;
                    snapped = true;
                }

                // 2. Grid Snap (only if not snapped to object)
                if (!snapped) {
                    finalPoint = applyGridSnap(point);
                }
                return finalPoint;
            };

            // Helper to apply pen guidelines snap
            const applyGuidelinesSnap = (point: Point, currentPointIndex: number | null = null) => {
                if (!guidelinesEnabled) {
                    state.updatePenState?.({ activeGuidelines: null });
                    return point;
                }

                // Update reference points cache (throttle to every 100ms, or when anchor count changes)
                const now = Date.now();
                const currentAnchorCount = currentPath?.anchors?.length || 0;
                const anchorCountChanged = currentAnchorCount !== lastAnchorCountRef.current;

                if (anchorCountChanged || now - lastReferenceUpdateRef.current > 100 || referencePointsRef.current.length === 0) {
                    const viewportInfo = {
                        zoom: state.viewport.zoom,
                        panX: state.viewport.panX,
                        panY: state.viewport.panY,
                        width: window.innerWidth,
                        height: window.innerHeight,
                    };
                    referencePointsRef.current = collectReferencePoints(
                        currentPath,
                        currentPointIndex,
                        state.elements,
                        viewportInfo,
                        penState.editingPathId
                    );
                    lastReferenceUpdateRef.current = now;
                    lastAnchorCountRef.current = currentAnchorCount;
                }

                // Find matching guidelines
                const threshold = 8 / viewportZoom; // 8px threshold scaled by zoom
                const guidelines = findPenGuidelines(point, referencePointsRef.current, threshold);

                // Update guidelines state for overlay rendering
                if (guidelines.horizontal || guidelines.vertical) {
                    state.updatePenState?.({ activeGuidelines: guidelines });
                    // Apply snap
                    return applyPenGuidelineSnap(point, guidelines.horizontal, guidelines.vertical);
                } else {
                    state.updatePenState?.({ activeGuidelines: null });
                    return point;
                }
            };

            let canvasPoint = getSnappedPoint(rawCanvasPoint);
            const detectionPoint = rawCanvasPoint;

            // Update modifier keys state
            isShiftPressedRef.current = event.shiftKey;
            isAltPressedRef.current = event.altKey;

            // Update cursor state and hover target based on hover (using detectionPoint)
            if (mode === 'drawing' && currentPath) {
                const { cursorState, hoverTarget } = calculateCursorState(
                    detectionPoint, // Use raw point for detection
                    mode,
                    currentPath,
                    penState.autoAddDelete,
                    viewportZoom
                );

                if (cursorState !== penState.cursorState || JSON.stringify(hoverTarget) !== JSON.stringify(penState.hoverTarget)) {
                    state.updatePenState?.({ cursorState, hoverTarget });
                }

                // Update rubber band preview if enabled (using snapped canvasPoint)
                if (rubberBandEnabled && !isDraggingRef.current) {
                    // Apply guidelines snap for preview
                    canvasPoint = applyGuidelinesSnap(canvasPoint, null);

                    // Store preview point for rendering
                    state.updatePenState?.({
                        previewAnchor: {
                            id: 'preview',
                            position: canvasPoint,
                            type: 'corner',
                        }
                    });
                }
            } else if ((mode === 'idle' || mode === 'editing')) {
                // Clear guidelines when not actively moving a point
                if (!isDraggingRef.current && penState.activeGuidelines) {
                    state.updatePenState?.({ activeGuidelines: null });
                }

                // Check for existing paths to edit (using detectionPoint)
                let newCursorState: PenCursorState = 'new-path';
                let newHoverTarget: typeof penState.hoverTarget = { type: 'none' };

                // If editing a specific path, check it first
                if (penState.editingPathId && penState.currentPath) {
                    const result = calculateEditCursorState(
                        detectionPoint, // Use raw point
                        penState.currentPath,
                        penState.editingPathId,
                        penState.editingSubPathIndex ?? 0, // Use the actual subpath index being edited
                        penState.autoAddDelete,
                        viewportZoom
                    );
                    newCursorState = result.cursorState;
                    newHoverTarget = result.hoverTarget;
                }

                // If nothing found on current path, check others
                if (newHoverTarget.type === 'none') {
                    const result = findPathAtPoint(detectionPoint, state.elements, viewportZoom);
                    if (result) {
                        const editResult = calculateEditCursorState(
                            detectionPoint,
                            result.penPath,
                            result.pathId,
                            result.subPathIndex,
                            penState.autoAddDelete,
                            viewportZoom
                        );
                        // If we hit something specific (anchor/segment), show that cursor
                        // Otherwise show default (to indicate selection/editing start)
                        newCursorState = editResult.cursorState === 'default' ? 'default' : editResult.cursorState;
                        newHoverTarget = editResult.hoverTarget;
                    } else {
                        // Not hovering over anything
                        if (penState.hoverTarget !== null) {
                            state.updatePenState?.({ hoverTarget: null });
                        }
                    }
                }

                if (newCursorState !== penState.cursorState) {
                    state.updatePenState?.({ cursorState: newCursorState });
                }
                if (JSON.stringify(newHoverTarget) !== JSON.stringify(penState.hoverTarget)) {
                    state.updatePenState?.({ hoverTarget: newHoverTarget });
                }
            }

            // Handle dragging (using snapped canvasPoint)
            if (isDraggingRef.current && dragStartPointRef.current) {
                const state = useCanvasStore.getState() as PenStore;
                const penState = state.pen;

                // Check if 'v' key is pressed during drag while drawing (move last anchor)
                if (isVKeyPressedRef.current && mode === 'drawing' && currentPath && currentPath.anchors.length > 0) {
                    if (!isMovingLastAnchorRef.current) {
                        // Just started moving, save original position
                        isMovingLastAnchorRef.current = true;
                        const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];
                        lastAnchorOriginalPositionRef.current = { ...lastAnchor.position };
                    }

                    // Apply guidelines snap when moving last anchor
                    const lastAnchorIndex = currentPath.anchors.length - 1;
                    const snappedPoint = applyGuidelinesSnap(canvasPoint, lastAnchorIndex);
                    // Move the last anchor to current position
                    moveLastAnchor(snappedPoint, useCanvasStore.getState);
                    return;
                }

                // If we were moving the anchor but 'v' key was released
                if (isMovingLastAnchorRef.current && !isVKeyPressedRef.current) {
                    // Stop moving mode, update drag start point to new anchor position
                    isMovingLastAnchorRef.current = false;
                    const stateAfterMove = useCanvasStore.getState() as PenStore;
                    const penStateAfterMove = stateAfterMove.pen;
                    if (penStateAfterMove?.currentPath && penStateAfterMove.currentPath.anchors.length > 0) {
                        const lastAnchor = penStateAfterMove.currentPath.anchors[penStateAfterMove.currentPath.anchors.length - 1];
                        dragStartPointRef.current = { ...lastAnchor.position };
                    }
                    lastAnchorOriginalPositionRef.current = null;
                }

                // Check if dragging a handle
                if (penState?.dragState?.type === 'handle') {
                    const { anchorIndex, handleType } = penState.dragState;
                    if (anchorIndex !== undefined && handleType && penState.currentPath) {
                        const anchor = penState.currentPath.anchors[anchorIndex];
                        if (anchor) {
                            // Apply Shift constraint if needed (supports virtualShift for mobile)
                            const effectiveShift = getEffectiveShift(isShiftPressedRef.current, state.isVirtualShiftActive);
                            let finalHandlePos = canvasPoint;
                            if (effectiveShift) {
                                finalHandlePos = constrainAngleTo45Degrees(anchor.position, canvasPoint);
                            } else {
                                // Apply guidelines snap for handle position (absolute position)
                                finalHandlePos = applyGuidelinesSnap(canvasPoint, null);
                            }

                            // Update the handle in real-time
                            updateHandle(
                                anchorIndex,
                                handleType,
                                finalHandlePos,
                                anchor.position,
                                isAltPressedRef.current,
                                useCanvasStore.getState
                            );
                        }
                    }
                    return;
                }

                // Check if dragging an anchor
                if (penState?.dragState?.type === 'anchor') {
                    const { anchorIndex } = penState.dragState;
                    if (anchorIndex !== undefined) {
                        // Apply guidelines snap when moving anchor
                        const snappedPoint = applyGuidelinesSnap(canvasPoint, anchorIndex);
                        // Move the anchor to current position
                        moveAnchor(anchorIndex, snappedPoint, useCanvasStore.getState);
                    }
                    return;
                }

                // Check if dragging/curving a segment
                if (penState?.dragState?.type === 'segment') {
                    const { segmentIndex } = penState.dragState;
                    if (segmentIndex !== undefined && penState.currentPath) {
                        // Supports virtualShift for mobile
                        const effectiveShift = getEffectiveShift(isShiftPressedRef.current, state.isVirtualShiftActive);
                        if (effectiveShift && dragStartPointRef.current && segmentOriginalAnchorsRef.current) {
                            // Shift+drag: translate segment (move both endpoints together)
                            // Calculate delta from drag start position
                            const delta = {
                                x: canvasPoint.x - dragStartPointRef.current.x,
                                y: canvasPoint.y - dragStartPointRef.current.y,
                            };
                            translateSegment(segmentIndex, delta, segmentOriginalAnchorsRef.current, useCanvasStore.getState);
                        } else {
                            // Normal drag: curve the segment
                            // Recalculate 't' parameter based on current mouse position
                            // to allow dynamic adjustment of handle weights
                            const result = findSegmentOnPath(detectionPoint, penState.currentPath, 20 / viewportZoom); // Use detectionPoint for finding segment t
                            const dynamicT = result && result.segmentIndex === segmentIndex ? result.t : 0.5;

                            // Curve the segment in real-time with dynamic t
                            curveSegment(segmentIndex, canvasPoint, dynamicT, useCanvasStore.getState);
                        }
                    }
                    return;
                }

                // Original drag logic for new anchors
                // Calculate handle vector (outHandle)
                if (!dragStartPointRef.current) return;

                // Apply guidelines snap or Shift constraint for handle position (supports virtualShift for mobile)
                const effectiveShift = getEffectiveShift(isShiftPressedRef.current, state.isVirtualShiftActive);
                let finalHandlePos = canvasPoint;
                if (effectiveShift) {
                    finalHandlePos = constrainAngleTo45Degrees(dragStartPointRef.current, canvasPoint);
                } else {
                    // Apply guidelines snap for handle position (absolute position)
                    finalHandlePos = applyGuidelinesSnap(canvasPoint, null);
                }

                const handleVector = {
                    x: finalHandlePos.x - dragStartPointRef.current.x,
                    y: finalHandlePos.y - dragStartPointRef.current.y,
                };

                // Handle Alt key logic for Cusp Creation
                if (isAltPressedRef.current) {
                    // If Alt is pressed, we are moving outHandle independently.
                    // We need to lock inHandle to what it was before Alt was pressed.
                    if (!savedInHandleRef.current) {
                        // If we just pressed Alt, save the current symmetric inHandle
                        savedInHandleRef.current = {
                            x: -handleVector.x,
                            y: -handleVector.y
                        };
                    }
                    // If we already saved it, keep it.
                } else {
                    // If Alt is NOT pressed, inHandle is symmetric to outHandle
                    savedInHandleRef.current = {
                        x: -handleVector.x,
                        y: -handleVector.y
                    };
                }

                // Update drag state for preview rendering
                // We need to pass both handles if they are independent?
                // RubberBandPreview currently infers inHandle from handleVector if Alt logic isn't explicit.
                // But we modified RubberBandPreview to show reflexive handle.
                // It calculates reflexive as -handleVector.
                // If we want it to show the LOCKED handle, we need to pass it.
                // But PenDragState doesn't have inHandle field yet.
                // For now, let's just update the state. The preview might be slightly off (symmetric)
                // until we update PenDragState, but the logic for creation will be correct.
                // Actually, let's update PenDragState to support explicit handles if we can,
                // or just rely on the final creation being correct.
                // The user wants visual feedback.
                // Let's assume for now the preview shows symmetric, but creation is correct.
                // Wait, user complained "Visual Feedback PENDIENTE DE PROBAR".
                // If I want preview to be correct, I need to pass the locked handle.

                // Update drag state for preview rendering
                state.updatePenState?.({
                    dragState: {
                        type: 'new-anchor',
                        startPoint: dragStartPointRef.current,
                        currentPoint: finalHandlePos,
                        // Pass explicit handles if available (for Cusp Creation visualization)
                        inHandle: savedInHandleRef.current || undefined,
                        outHandle: handleVector
                    },
                });
            }
        };

        /**
         * Handle pointer up - finalize anchor placement
         */
        const handlePointerUp = (event: PointerEvent) => {

            if (!svgRef.current || !isDraggingRef.current || !dragStartPointRef.current) return;

            // screenToCanvas already handles getBoundingClientRect internally
            const rawCanvasPoint = screenToCanvas(
                event.clientX,
                event.clientY
            );

            const state = useCanvasStore.getState() as PenStore;
            const penState = state.pen;

            if (!penState) return;

            // Use raw positions for drag detection to avoid false positives from snap offset
            const rawStartPoint = rawDragStartPointRef.current || dragStartPointRef.current;
            const rawHandleVector = {
                x: rawCanvasPoint.x - rawStartPoint.x,
                y: rawCanvasPoint.y - rawStartPoint.y,
            };
            const rawHandleMagnitude = Math.sqrt(rawHandleVector.x ** 2 + rawHandleVector.y ** 2);
            const wasRealDrag = rawHandleMagnitude > 5; // Use slightly larger threshold for raw detection

            const { mode, currentPath, dragState } = penState;

            // If dragging a handle, just clear the drag state (update was already done in move)
            if (dragState?.type === 'handle') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                rawDragStartPointRef.current = null;
                state.updatePenState?.({ dragState: null, activeGuidelines: null });
                return;
            }

            // If dragging an anchor, just clear the drag state (update was already done in move)
            if (dragState?.type === 'anchor') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                rawDragStartPointRef.current = null;
                state.updatePenState?.({ dragState: null, activeGuidelines: null });
                referencePointsRef.current = []; // Clear cache for next operation
                return;
            }

            // If dragging/curving a segment, just clear the drag state (update was already done in move)
            if (dragState?.type === 'segment') {
                isDraggingRef.current = false;
                dragStartPointRef.current = null;
                rawDragStartPointRef.current = null;
                segmentOriginalAnchorsRef.current = null; // Clear original anchor positions
                state.updatePenState?.({ dragState: null, activeGuidelines: null });
                return;
            }

            if (mode === 'drawing') {
                // Apply guidelines snap or Shift constraint for the final handle position (supports virtualShift for mobile)
                const effectiveShift = getEffectiveShift(isShiftPressedRef.current, state.isVirtualShiftActive);
                let finalHandlePos = rawCanvasPoint;
                if (effectiveShift) {
                    finalHandlePos = constrainAngleTo45Degrees(dragStartPointRef.current, rawCanvasPoint);
                } else if (penState.activeGuidelines) {
                    // Apply guidelines snap if there was one active
                    const { horizontal, vertical } = penState.activeGuidelines;
                    if (horizontal) {
                        finalHandlePos = { ...finalHandlePos, y: horizontal.snappedPosition.y };
                    }
                    if (vertical) {
                        finalHandlePos = { ...finalHandlePos, x: vertical.snappedPosition.x };
                    }
                }

                // Calculate handle vector (outHandle) with potentially snapped point
                const handleVector = {
                    x: finalHandlePos.x - dragStartPointRef.current.x,
                    y: finalHandlePos.y - dragStartPointRef.current.y,
                };

                // Use wasRealDrag (calculated with raw points) to determine if this was a click or drag
                // This prevents false positives from grid snap offset differences
                const isDragGesture = wasRealDrag;

                // Check if this is the first point being dragged (not a new point)
                // This is true when:
                // 1. Path has only 1 anchor AND
                // 2. The drag start point is the same as the first anchor position
                const firstAnchor = currentPath?.anchors[0];
                const isFirstPointDrag = currentPath &&
                    currentPath.anchors.length === 1 &&
                    firstAnchor &&
                    Math.abs(dragStartPointRef.current.x - firstAnchor.position.x) < 1 &&
                    Math.abs(dragStartPointRef.current.y - firstAnchor.position.y) < 1;

                if (!isDragGesture) {
                    // Simple click - add straight anchor (but not if it's still the first point being placed)
                    if (!isFirstPointDrag) {
                        let finalPoint = dragStartPointRef.current;

                        // Apply Shift constraint for straight lines (supports virtualShift for mobile)
                        if (effectiveShift && currentPath && currentPath.anchors.length > 0) {
                            const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];
                            finalPoint = constrainAngleTo45Degrees(lastAnchor.position, dragStartPointRef.current);
                        }

                        addStraightAnchor(finalPoint, useCanvasStore.getState);
                    }
                    // If first point with no drag, just keep it as corner (no action needed)
                } else {
                    // Drag gesture - use the already calculated handleVector which has snap applied
                    const outHandle = { ...handleVector };

                    if (isFirstPointDrag) {
                        // First point with drag - update handles on first anchor only
                        // These handles will be used:
                        // - outHandle: for the NEXT segment (when second point is added)
                        // - inHandle: for the CLOSING segment (when path is closed)
                        const anchors = [...currentPath.anchors];

                        // Check if Alt is pressed for cusp (asymmetric handles)
                        if (isAltPressedRef.current) {
                            anchors[0] = {
                                ...anchors[0],
                                type: 'cusp',
                                outHandle: outHandle,
                                inHandle: savedInHandleRef.current || { x: -outHandle.x, y: -outHandle.y },
                            };
                        } else {
                            anchors[0] = {
                                ...anchors[0],
                                type: 'smooth',
                                outHandle: outHandle,
                                inHandle: { x: -outHandle.x, y: -outHandle.y }, // Symmetric
                            };
                        }

                        state.updatePenState?.({
                            currentPath: {
                                ...currentPath,
                                anchors
                            }
                        });

                        // Save to history after updating first point handles
                        savePathToHistory(useCanvasStore.getState);
                    } else {
                        // Subsequent points - add new curved anchor
                        // Check for Alt key (cusp creation)
                        if (isAltPressedRef.current && savedInHandleRef.current) {
                            // Add cusp anchor with locked inHandle
                            addCurvedAnchor(
                                dragStartPointRef.current,
                                outHandle,
                                useCanvasStore.getState,
                                { inHandle: savedInHandleRef.current, type: 'cusp' }
                            );
                        } else {
                            addCurvedAnchor(dragStartPointRef.current, outHandle, useCanvasStore.getState);
                        }
                    }
                }
            }

            // Reset drag state
            isDraggingRef.current = false;
            dragStartPointRef.current = null;
            rawDragStartPointRef.current = null;
            savedInHandleRef.current = null;
            state.updatePenState?.({ dragState: null });
        };

        /**
         * Handle keyboard events
         */
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                isShiftPressedRef.current = true;

                // If currently dragging a segment and Shift was just pressed,
                // update the original anchor positions to current positions
                // This allows switching from curve mode to translate mode mid-drag
                const state = useCanvasStore.getState() as PenStore;
                const penState = state.pen;
                if (penState?.dragState?.type === 'segment' && penState.currentPath) {
                    const { segmentIndex } = penState.dragState;
                    if (segmentIndex !== undefined) {
                        const anchors = penState.currentPath.anchors;
                        const startIndex = segmentIndex;
                        const endIndex = (segmentIndex + 1) % anchors.length;
                        // Update original positions to current (curved) positions
                        segmentOriginalAnchorsRef.current = {
                            start: { ...anchors[startIndex].position },
                            end: { ...anchors[endIndex].position },
                        };
                        // Also update dragStartPoint to current mouse position
                        // This is needed so the delta calculation starts fresh from here
                        // We'll use the currentPoint from dragState as the new reference
                        if (penState.dragState.currentPoint) {
                            dragStartPointRef.current = { ...penState.dragState.currentPoint };
                        }
                    }
                }
            } else if (event.key === 'Alt') {
                isAltPressedRef.current = true;
            } else if (event.key === 'v' || event.key === 'V') {
                // 'V' key for moving last anchor (Spacebar is reserved for pan)
                isVKeyPressedRef.current = true;
            } else if (event.key === 'Enter') {
                // Finalize current path
                finalizePath(useCanvasStore.getState);
            } else if (event.key === 'Escape') {
                // Cancel current path
                cancelPath(useCanvasStore.getState);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                isShiftPressedRef.current = false;
            } else if (event.key === 'Alt') {
                isAltPressedRef.current = false;
            } else if (event.key === 'v' || event.key === 'V') {
                isVKeyPressedRef.current = false;
            }
        };

        // Install event listeners via centralized helper; return cleanup callback
        const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
            { event: 'pointerdown', handler: (e: Event) => handlePointerDown(e as PointerEvent) },
            { event: 'pointermove', handler: (e: Event) => handlePointerMove(e as PointerEvent) },
            { event: 'pointerup', handler: (e: Event) => handlePointerUp(e as PointerEvent) },
            { event: 'keydown', handler: (e: Event) => handleKeyDown(e as KeyboardEvent) },
            { event: 'keyup', handler: (e: Event) => handleKeyUp(e as KeyboardEvent) },
        ], (state) => (state as PenStore).activePlugin !== 'pen');

        return cleanup;
    }, [isActive, svgRef, screenToCanvas, viewportZoom]);
}
