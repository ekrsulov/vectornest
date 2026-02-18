import type { Point, PathData } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { PenAnchorPoint, PenPath } from './types';
import type { PenPluginSlice } from './slice';
import { penPathToCommands, pathDataToPenPath } from './utils/pathConverter';
import { toLocalPenPath, toWorldPenPath } from './utils/penPathTransforms';

type PenStore = CanvasStore & PenPluginSlice;

// Simple ID generator for pen anchors and paths
function generateId(): string {
    return `pen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new path with the first anchor point
 */
export function startPath(
    point: Point,
    getState: () => CanvasStore
): void {
    const state = getState();


    const firstAnchor: PenAnchorPoint = {
        id: generateId(),
        position: { ...point },
        type: 'corner',
    };

    const newPath: PenPath = {
        anchors: [firstAnchor],
        closed: false,
        tempId: generateId(),
    };

    // Initialize history with the first state
    const initialHistory = [JSON.parse(JSON.stringify(newPath))];

    state.updatePenState?.({
        mode: 'drawing',
        currentPath: newPath,
        activeAnchorIndex: 0,
        cursorState: 'continue',
        pathHistory: initialHistory,
        pathHistoryIndex: 0,
    });

}

/**
 * Add a straight (corner) anchor to the current path
 */
export function addStraightAnchor(
    point: Point,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath || penState.mode !== 'drawing') {
        return;
    }

    const newAnchor: PenAnchorPoint = {
        id: generateId(),
        position: { ...point },
        type: 'corner',
    };

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors: [...penState.currentPath.anchors, newAnchor],
    };

    state.updatePenState?.({
        currentPath: updatedPath,
        activeAnchorIndex: updatedPath.anchors.length - 1,
    });

    // Save to history after adding anchor
    savePathToHistory(getState);
}

/**
 * Add a curved anchor point with handle
 * @param point - Position of the anchor
 * @param handleOut - Outgoing handle vector (relative to anchor position)
 * @param getState - Store getter
 * @param options - Optional parameters for custom handle configuration
 * @param options.inHandle - Custom incoming handle (for cusp creation). If not provided, symmetric to outHandle.
 * @param options.type - Anchor type ('smooth' or 'cusp'). Defaults to 'smooth'.
 */
export function addCurvedAnchor(
    point: Point,
    handleOut: Point,
    getState: () => CanvasStore,
    options?: { inHandle?: Point; type?: 'smooth' | 'cusp' }
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath || penState.mode !== 'drawing') {
        return;
    }

    // Use custom inHandle if provided (for cusp), otherwise symmetric
    const inHandle = options?.inHandle ?? {
        x: -handleOut.x,
        y: -handleOut.y,
    };

    // Use custom type if provided, otherwise 'smooth'
    const anchorType = options?.type ?? 'smooth';

    const newAnchor: PenAnchorPoint = {
        id: generateId(),
        position: { ...point },
        type: anchorType,
        inHandle: { ...inHandle },
        outHandle: { ...handleOut },
    };

    const updatedAnchors = [...penState.currentPath.anchors, newAnchor];

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors: updatedAnchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
        activeAnchorIndex: updatedAnchors.length - 1,
    });

    // Save to history after adding anchor
    savePathToHistory(getState);
}

/**
 * Update handles on an existing anchor
 */
export function updateAnchorHandles(
    anchorIndex: number,
    handles: { inHandle?: Point; outHandle?: Point },
    getState: () => CanvasStore,
    saveToHistory: boolean = false
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
        return;
    }

    const anchor = { ...anchors[anchorIndex] };

    if (handles.inHandle !== undefined) {
        anchor.inHandle = handles.inHandle ? { ...handles.inHandle } : undefined;
    }
    if (handles.outHandle !== undefined) {
        anchor.outHandle = handles.outHandle ? { ...handles.outHandle } : undefined;
    }

    // Update anchor type based on handle configuration
    if (!anchor.inHandle && !anchor.outHandle) {
        anchor.type = 'corner';
    } else if (anchor.inHandle && anchor.outHandle) {
        // Check if handles are collinear for smooth vs cusp
        anchor.type = 'smooth'; // Default to smooth, can be refined later
    }

    anchors[anchorIndex] = anchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    // Save to history if requested (typically after drag ends)
    if (saveToHistory && penState.mode === 'drawing') {
        savePathToHistory(getState);
    }
}

/**
 * Close the current path by connecting last anchor to first
 */
export function closePath(getState: () => CanvasStore): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath || penState.mode !== 'drawing') {
        return;
    }

    // Check if path can be closed using the same logic as cursor detection
    // - 3+ anchors: always can close
    // - 2 anchors: can close only if there's a curve (any anchor has handles)
    const path = penState.currentPath;
    const canClose = path.anchors.length >= 3 ||
        (path.anchors.length === 2 && path.anchors.some((a: { inHandle?: unknown; outHandle?: unknown }) => a.inHandle || a.outHandle));

    if (!canClose) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    const firstAnchor = { ...anchors[0] };
    const lastAnchor = { ...anchors[anchors.length - 1] };

    // Ensure continuity when closing: if last anchor has an outHandle,
    // create a symmetric inHandle for the first anchor
    if (lastAnchor.outHandle && !firstAnchor.inHandle) {
        firstAnchor.inHandle = {
            x: -lastAnchor.outHandle.x,
            y: -lastAnchor.outHandle.y,
        };
        // Update anchor type to smooth if it now has handles on both sides
        if (firstAnchor.outHandle) {
            firstAnchor.type = 'smooth';
        }
        anchors[0] = firstAnchor;
    }

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
        closed: true,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    // Automatically finalize when closing
    finalizePath(getState);
}

/**
 * Finalize the current path and add it to the canvas as a PathElement
 */
export function finalizePath(getState: () => CanvasStore): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const path = penState.currentPath;

    // Detect and warn about stray points (single anchor)
    if (path.anchors.length < 2) {
        console.warn('Pen tool: Stray point detected. Path requires at least 2 anchors.');
        // Clear the path without creating element
        cancelPath(getState);
        return;
    }

    // If path is closed, ensure continuity of handles at closing point
    if (path.closed && path.anchors.length >= 2) {
        const anchors = [...path.anchors];
        const firstAnchor = anchors[0];
        const lastAnchor = anchors[anchors.length - 1];

        // If first anchor has no inHandle but last has outHandle, connect them
        if (!firstAnchor.inHandle && lastAnchor.outHandle) {
            // Make first anchor smooth by mirroring last's outHandle
            anchors[0] = {
                ...firstAnchor,
                inHandle: {
                    x: -lastAnchor.outHandle.x,
                    y: -lastAnchor.outHandle.y,
                },
                type: firstAnchor.outHandle ? 'smooth' : firstAnchor.type,
            };
        }

        // Update path with improved closing continuity
        path.anchors = anchors;
    }

    // Check if we are editing an existing path
    if (penState.editingPathId) {
        const existingElement = state.elements.find(el => el.id === penState.editingPathId);

        if (existingElement && existingElement.type === 'path') {
            // currentPath is stored in world coordinates while editing;
            // convert back to element-local coordinates before persisting.
            const localPath = toLocalPenPath(path, penState.editingPathId, state.elements);
            const commands = penPathToCommands(localPath);
            const pathData = existingElement.data as PathData;
            // Update the specific subpath being edited
            const updatedSubPaths = [...pathData.subPaths];
            updatedSubPaths[penState.editingSubPathIndex ?? 0] = commands;

            state.updateElement?.(penState.editingPathId, {
                data: {
                    ...existingElement.data,
                    subPaths: updatedSubPaths
                }
            });
        }
    } else {
        // Creating new path
        const commands = penPathToCommands(path);
        // Get stroke/fill settings from centralized StyleSlice
        const style = state.style || {};

        // Create PathData using settings from centralized style state
        const pathData = {
            subPaths: [commands],
            strokeWidth: style.strokeWidth || 4,
            strokeColor: style.strokeColor || '#000000',
            strokeOpacity: style.strokeOpacity || 1,
            fillColor: style.fillColor || 'none',
            fillOpacity: style.fillOpacity || 1,
            strokeLinecap: style.strokeLinecap || 'round',
            strokeLinejoin: style.strokeLinejoin || 'round',
            fillRule: style.fillRule || 'nonzero',
            strokeDasharray: style.strokeDasharray || 'none',
        };

        // Add element to canvas
        state.addElement?.({
            type: 'path',
            data: pathData,
        });
    }

    // Reset pen state to idle and clear history
    state.updatePenState?.({
        mode: 'idle',
        currentPath: null,
        activeAnchorIndex: null,
        previewAnchor: null,
        cursorState: 'new-path',
        editingPathId: null,
        editingSubPathIndex: null,
        selectedAnchorIndex: null,
        pathHistory: [],
        pathHistoryIndex: -1,
    });
}

/**
 * Cancel the current path without saving
 */
export function cancelPath(getState: () => CanvasStore): void {
    const state = getState();

    state.updatePenState?.({
        mode: 'idle',
        currentPath: null,
        activeAnchorIndex: null,
        previewAnchor: null,
        cursorState: 'new-path',
        editingPathId: null,
        editingSubPathIndex: null,
        pathHistory: [],
        pathHistoryIndex: -1,
    });
}

/**
 * Convert an anchor to corner type (remove handles)
 */
export function convertAnchorToCorner(
    anchorIndex: number,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
        return;
    }

    anchors[anchorIndex] = {
        ...anchors[anchorIndex],
        type: 'corner',
        inHandle: undefined,
        outHandle: undefined,
    };

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });
}

/**
 * Break handle linkage to convert smooth anchor to cusp
 */
export function breakHandleLinkage(
    anchorIndex: number,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
        return;
    }

    const anchor = anchors[anchorIndex];
    if (anchor.type !== 'smooth') {
        return; // Only convert smooth to cusp
    }

    anchors[anchorIndex] = {
        ...anchor,
        type: 'cusp',
    };

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });
}

/**
 * Start editing an existing path
 */
export function startEditingPath(
    pathId: string,
    getState: () => CanvasStore,
    subPathIndex: number = 0
): void {
    const state = getState();
    const element = state.elements.find(el => el.id === pathId);

    if (!element || element.type !== 'path') return;
    const pathData = element.data as PathData;

    // Check if the subpath index is valid
    if (subPathIndex < 0 || subPathIndex >= pathData.subPaths.length) return;

    // Convert the specific subpath to PenPath (stored in local coordinates)
    // and project it to world coordinates for pointer interactions/overlays.
    const localPenPath = pathDataToPenPath(pathData.subPaths[subPathIndex], pathId);
    const penPath = toWorldPenPath(localPenPath, pathId, state.elements);

    state.updatePenState?.({
        mode: 'editing',
        currentPath: penPath,
        editingPathId: pathId,
        editingSubPathIndex: subPathIndex,
        activeAnchorIndex: null,
        selectedAnchorIndex: null,
        cursorState: 'default',
    });

    // Select the element in canvas
    state.setSelectedElements?.([pathId]);
}

/**
 * Add an anchor to a specific segment on the current path
 */
export function addAnchorToSegment(
    segmentIndex: number,
    point: Point,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) return;

    const path = penState.currentPath;
    const anchors = [...path.anchors];

    const startAnchor = anchors[segmentIndex];
    const endAnchor = anchors[(segmentIndex + 1) % anchors.length];

    const isCurved = startAnchor.outHandle || endAnchor.inHandle;

    const newAnchor: PenAnchorPoint = {
        id: generateId(),
        position: { ...point },
        type: isCurved ? 'smooth' : 'corner',
        // TODO: Calculate handles for splitting curve properly
        // For now, we just insert the point. If it was smooth, we might want handles.
        // If we insert into a curve without handles, it becomes a sharp corner on a curve?
        // Ideally we split the bezier.
    };

    anchors.splice(segmentIndex + 1, 0, newAnchor);

    const updatedPath = { ...path, anchors };

    state.updatePenState?.({
        currentPath: updatedPath,
        activeAnchorIndex: segmentIndex + 1,
        selectedAnchorIndex: segmentIndex + 1,
    });

    // If in editing mode, update the canvas element immediately
    if (penState.mode === 'editing' && penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Delete an anchor from the path
 */
export function deleteAnchor(
    anchorIndex: number,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) return;

    const path = penState.currentPath;
    const anchors = [...path.anchors];

    if (anchors.length <= 2 && !path.closed) {
        return;
    }

    anchors.splice(anchorIndex, 1);

    const updatedPath = { ...path, anchors };

    // If we deleted the last anchor of an open path, update active index
    let newActiveIndex = penState.activeAnchorIndex;
    if (newActiveIndex === anchorIndex) {
        newActiveIndex = anchors.length - 1;
    } else if (newActiveIndex !== null && newActiveIndex > anchorIndex) {
        newActiveIndex--;
    }

    state.updatePenState?.({
        currentPath: updatedPath,
        activeAnchorIndex: newActiveIndex,
        selectedAnchorIndex: null,
    });

    // If in editing mode, update canvas
    if (penState.mode === 'editing' && penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Convert anchor type (corner <-> smooth)
 */
export function convertAnchorType(
    anchorIndex: number,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) return;

    const path = penState.currentPath;
    const anchors = [...path.anchors];
    const anchor = { ...anchors[anchorIndex] };

    if (anchor.type === 'corner') {
        // Convert to smooth
        anchor.type = 'smooth';
        // Create default handles
        anchor.inHandle = { x: -20, y: 0 };
        anchor.outHandle = { x: 20, y: 0 };
    } else {
        // Convert to corner
        anchor.type = 'corner';
        anchor.inHandle = undefined;
        anchor.outHandle = undefined;
    }

    anchors[anchorIndex] = anchor;
    const updatedPath = { ...path, anchors };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    if (penState.mode === 'editing' && penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Continue drawing from an endpoint of an existing path
 */
export function continueFromEndpoint(
    pathId: string,
    anchorIndex: number, // 0 or length-1
    getState: () => CanvasStore,
    subPathIndex: number = 0
): void {
    const state = getState();

    // Start editing first to load the path
    startEditingPath(pathId, getState, subPathIndex);

    // Fetch fresh state after startEditingPath updates it
    const stateAfterEdit = getState();
    const penState = (stateAfterEdit as PenStore).pen;
    const path = penState.currentPath;

    if (!path) return;

    let updatedPath = path;
    if (anchorIndex === 0) {
        // Reverse anchors and handles to continue from the "start"
        const reversedAnchors = [...path.anchors].reverse().map(a => ({
            ...a,
            inHandle: a.outHandle, // Swap handles
            outHandle: a.inHandle
        }));
        updatedPath = { ...path, anchors: reversedAnchors };
    }

    state.updatePenState?.({
        mode: 'drawing',
        currentPath: updatedPath,
        activeAnchorIndex: updatedPath.anchors.length - 1,
        cursorState: 'continue',
    });
}

// Helper to update canvas element during editing
function updatePathOnCanvas(
    path: PenPath,
    pathId: string,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.editingPathId || penState.editingSubPathIndex === null) return;

    const element = state.elements.find(el => el.id === pathId);
    if (!element || element.type !== 'path') return;
    const pathData = element.data as PathData;

    // currentPath is in world coordinates during editing; persist in local coordinates.
    const localPath = toLocalPenPath(path, pathId, state.elements);
    const commands = penPathToCommands(localPath);

    // Create a copy of the subPaths array and update only the specific subpath
    const updatedSubPaths = [...pathData.subPaths];
    updatedSubPaths[penState.editingSubPathIndex] = commands;

    state.updateElement?.(pathId, {
        data: {
            ...element.data,
            subPaths: updatedSubPaths
        }
    });
}

/**
 * Update a specific handle during drag operation
 * This allows direct manipulation of handles with proper type management
 */
export function updateHandle(
    anchorIndex: number,
    handleType: 'in' | 'out',
    newHandlePosition: Point,
    anchorPosition: Point,
    isAltPressed: boolean,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
        return;
    }

    const anchor = { ...anchors[anchorIndex] };

    // Calculate handle vector relative to anchor
    const handleVector: Point = {
        x: newHandlePosition.x - anchorPosition.x,
        y: newHandlePosition.y - anchorPosition.y,
    };

    if (handleType === 'out') {
        anchor.outHandle = handleVector;

        // If Alt is NOT pressed and anchor is smooth, update the opposite handle symmetrically
        if (!isAltPressed && anchor.type === 'smooth' && anchor.inHandle) {
            anchor.inHandle = {
                x: -handleVector.x,
                y: -handleVector.y,
            };
        } else if (isAltPressed) {
            // Alt pressed: break linkage, convert to cusp
            anchor.type = 'cusp';
        }
    } else {
        // handleType === 'in'
        anchor.inHandle = handleVector;

        // If Alt is NOT pressed and anchor is smooth, update the opposite handle symmetrically
        if (!isAltPressed && anchor.type === 'smooth' && anchor.outHandle) {
            anchor.outHandle = {
                x: -handleVector.x,
                y: -handleVector.y,
            };
        } else if (isAltPressed) {
            // Alt pressed: break linkage, convert to cusp
            anchor.type = 'cusp';
        }
    }

    anchors[anchorIndex] = anchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    // If editing an existing path, also update the element
    if (penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Move the last placed anchor to a new position
 * Used for Spacebar repositioning during drag
 */
export function moveLastAnchor(
    newPosition: Point,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath || penState.mode !== 'drawing') {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchors.length === 0) {
        return;
    }

    const lastIndex = anchors.length - 1;
    const lastAnchor = { ...anchors[lastIndex] };

    // Update position (handles are already relative to anchor position)
    lastAnchor.position = { ...newPosition };

    // Also move handles to maintain their relative positions
    if (lastAnchor.inHandle) {
        // Handles are relative, no need to adjust
        // Actually, handles are already relative to the anchor position
        // so we don't need to modify them
    }

    anchors[lastIndex] = lastAnchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });
}

/**
 * Move an anchor to a new position during editing
 * Used when dragging anchors with Auto Add/Delete disabled
 */
export function moveAnchor(
    anchorIndex: number,
    newPosition: Point,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    if (anchorIndex < 0 || anchorIndex >= anchors.length) {
        return;
    }

    const anchor = { ...anchors[anchorIndex] };

    // Update position (handles are relative, so they don't need adjustment)
    anchor.position = { ...newPosition };

    anchors[anchorIndex] = anchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    // If editing an existing path, also update the element
    if (penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Curve a segment by adjusting or creating handles
 * Used when dragging a segment with Auto Add/Delete disabled
 */
export function curveSegment(
    segmentIndex: number,
    dragPoint: Point,
    t: number,
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    const startIndex = segmentIndex;
    const endIndex = (segmentIndex + 1) % anchors.length;

    if (startIndex < 0 || startIndex >= anchors.length) {
        return;
    }

    const startAnchor = { ...anchors[startIndex] };
    const endAnchor = { ...anchors[endIndex] };

    const p0 = startAnchor.position;
    const p3 = endAnchor.position;

    const linePoint = {
        x: p0.x + t * (p3.x - p0.x),
        y: p0.y + t * (p3.y - p0.y),
    };

    const displacement = {
        x: dragPoint.x - linePoint.x,
        y: dragPoint.y - linePoint.y,
    };

    // Calculate the magnitude of displacement (distance from line)
    const displacementMagnitude = Math.sqrt(displacement.x ** 2 + displacement.y ** 2);

    // Threshold for detecting "almost straight" - if displacement is very small, make it straight
    const straightnessThreshold = 3; // pixels
    if (displacementMagnitude < straightnessThreshold) {
        // Convert back to straight line by removing handles
        startAnchor.outHandle = undefined;
        endAnchor.inHandle = undefined;

        // Also update symmetric handles if they exist
        if (startAnchor.type === 'smooth' && !startAnchor.inHandle) {
            startAnchor.type = 'corner';
        }
        if (endAnchor.type === 'smooth' && !endAnchor.outHandle) {
            endAnchor.type = 'corner';
        }

        // Check if adjacent segments also form straight lines and simplify them
        // Check previous segment (between anchors[startIndex-1] and startAnchor)
        if (startIndex > 0) {
            const prevAnchor = { ...anchors[startIndex - 1] };
            const prevPos = prevAnchor.position;
            const currentPos = startAnchor.position;

            // Check if there are handles that would curve this segment
            if (prevAnchor.outHandle || startAnchor.inHandle) {
                // Calculate if the segment is actually straight despite having handles
                const segVec = { x: currentPos.x - prevPos.x, y: currentPos.y - prevPos.y };
                const segLen = Math.sqrt(segVec.x ** 2 + segVec.y ** 2);

                if (segLen > 0) {
                    const segNorm = { x: segVec.x / segLen, y: segVec.y / segLen };

                    let isActuallyStraight = true;

                    // Check if outHandle is aligned with the segment
                    if (prevAnchor.outHandle) {
                        const handleLen = Math.sqrt(prevAnchor.outHandle.x ** 2 + prevAnchor.outHandle.y ** 2);
                        if (handleLen > 0.1) {
                            const handleNorm = {
                                x: prevAnchor.outHandle.x / handleLen,
                                y: prevAnchor.outHandle.y / handleLen
                            };
                            const dot = handleNorm.x * segNorm.x + handleNorm.y * segNorm.y;
                            if (Math.abs(dot - 1) > 0.01) { // Not aligned
                                isActuallyStraight = false;
                            }
                        }
                    }

                    // Check if inHandle is aligned with the segment (opposite direction)
                    if (isActuallyStraight && startAnchor.inHandle) {
                        const handleLen = Math.sqrt(startAnchor.inHandle.x ** 2 + startAnchor.inHandle.y ** 2);
                        if (handleLen > 0.1) {
                            const handleNorm = {
                                x: startAnchor.inHandle.x / handleLen,
                                y: startAnchor.inHandle.y / handleLen
                            };
                            const dot = handleNorm.x * (-segNorm.x) + handleNorm.y * (-segNorm.y);
                            if (Math.abs(dot - 1) > 0.01) { // Not aligned
                                isActuallyStraight = false;
                            }
                        }
                    }

                    if (isActuallyStraight) {
                        prevAnchor.outHandle = undefined;
                        startAnchor.inHandle = undefined;
                        if (prevAnchor.type === 'smooth' && !prevAnchor.inHandle) {
                            prevAnchor.type = 'corner';
                        }
                        if (startAnchor.type === 'smooth' && !startAnchor.outHandle) {
                            startAnchor.type = 'corner';
                        }
                        anchors[startIndex - 1] = prevAnchor;
                    }
                }
            }
        }

        // Check next segment (between endAnchor and anchors[endIndex+1])
        if (endIndex < anchors.length - 1) {
            const nextAnchor = { ...anchors[endIndex + 1] };
            const currentPos = endAnchor.position;
            const nextPos = nextAnchor.position;

            // Check if there are handles that would curve this segment
            if (endAnchor.outHandle || nextAnchor.inHandle) {
                // Calculate if the segment is actually straight despite having handles
                const segVec = { x: nextPos.x - currentPos.x, y: nextPos.y - currentPos.y };
                const segLen = Math.sqrt(segVec.x ** 2 + segVec.y ** 2);

                if (segLen > 0) {
                    const segNorm = { x: segVec.x / segLen, y: segVec.y / segLen };

                    let isActuallyStraight = true;

                    // Check if outHandle is aligned with the segment
                    if (endAnchor.outHandle) {
                        const handleLen = Math.sqrt(endAnchor.outHandle.x ** 2 + endAnchor.outHandle.y ** 2);
                        if (handleLen > 0.1) {
                            const handleNorm = {
                                x: endAnchor.outHandle.x / handleLen,
                                y: endAnchor.outHandle.y / handleLen
                            };
                            const dot = handleNorm.x * segNorm.x + handleNorm.y * segNorm.y;
                            if (Math.abs(dot - 1) > 0.01) { // Not aligned
                                isActuallyStraight = false;
                            }
                        }
                    }

                    // Check if inHandle is aligned with the segment (opposite direction)
                    if (isActuallyStraight && nextAnchor.inHandle) {
                        const handleLen = Math.sqrt(nextAnchor.inHandle.x ** 2 + nextAnchor.inHandle.y ** 2);
                        if (handleLen > 0.1) {
                            const handleNorm = {
                                x: nextAnchor.inHandle.x / handleLen,
                                y: nextAnchor.inHandle.y / handleLen
                            };
                            const dot = handleNorm.x * (-segNorm.x) + handleNorm.y * (-segNorm.y);
                            if (Math.abs(dot - 1) > 0.01) { // Not aligned
                                isActuallyStraight = false;
                            }
                        }
                    }

                    if (isActuallyStraight) {
                        endAnchor.outHandle = undefined;
                        nextAnchor.inHandle = undefined;
                        if (endAnchor.type === 'smooth' && !endAnchor.inHandle) {
                            endAnchor.type = 'corner';
                        }
                        if (nextAnchor.type === 'smooth' && !nextAnchor.outHandle) {
                            nextAnchor.type = 'corner';
                        }
                        anchors[endIndex + 1] = nextAnchor;
                    }
                }
            }
        }

        anchors[startIndex] = startAnchor;
        anchors[endIndex] = endAnchor;

        const updatedPath: PenPath = {
            ...penState.currentPath,
            anchors,
        };

        state.updatePenState?.({
            currentPath: updatedPath,
        });

        if (penState.editingPathId) {
            updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
        }

        return;
    }

    // Use 't' parameter to weight the handles differently
    // t closer to 0 = more weight on start handle
    // t closer to 1 = more weight on end handle
    const startWeight = (1 - t) * (1 - t); // Stronger when near start
    const endWeight = t * t; // Stronger when near end

    // Normalize weights
    const totalWeight = startWeight + endWeight;
    const normalizedStartWeight = totalWeight > 0 ? startWeight / totalWeight : 0.5;
    const normalizedEndWeight = totalWeight > 0 ? endWeight / totalWeight : 0.5;

    // Calculate handle vectors using displacement direction and asymmetric weighting
    // Handles point towards the drag point, scaled by weights
    const startHandleVector = {
        x: displacement.x * (0.5 + normalizedStartWeight),
        y: displacement.y * (0.5 + normalizedStartWeight),
    };

    const endHandleVector = {
        x: displacement.x * (0.5 + normalizedEndWeight),
        y: displacement.y * (0.5 + normalizedEndWeight),
    };

    startAnchor.outHandle = startHandleVector;
    endAnchor.inHandle = endHandleVector;

    // Check adjacent segments to maintain straight line continuity
    // If the previous segment (before startAnchor) is straight, align inHandle along that line
    if (startIndex > 0) {
        const prevAnchor = anchors[startIndex - 1];
        const isPrevSegmentStraight = !prevAnchor.outHandle && !startAnchor.inHandle;

        if (isPrevSegmentStraight) {
            // Calculate direction from previous anchor to start anchor
            const prevVector = {
                x: startAnchor.position.x - prevAnchor.position.x,
                y: startAnchor.position.y - prevAnchor.position.y,
            };
            const prevLength = Math.sqrt(prevVector.x ** 2 + prevVector.y ** 2);

            if (prevLength > 0) {
                const prevNormalized = {
                    x: prevVector.x / prevLength,
                    y: prevVector.y / prevLength,
                };

                // Set inHandle along the previous segment direction to maintain straight line
                const inHandleLength = Math.min(prevLength / 3, displacementMagnitude * 0.8);
                startAnchor.inHandle = {
                    x: -prevNormalized.x * inHandleLength,
                    y: -prevNormalized.y * inHandleLength,
                };
            }
        }
    }

    // If the next segment (after endAnchor) is straight, align outHandle along that line
    if (endIndex < anchors.length - 1) {
        const nextAnchor = anchors[endIndex + 1];
        const isNextSegmentStraight = !endAnchor.outHandle && !nextAnchor.inHandle;

        if (isNextSegmentStraight) {
            // Calculate direction from end anchor to next anchor
            const nextVector = {
                x: nextAnchor.position.x - endAnchor.position.x,
                y: nextAnchor.position.y - endAnchor.position.y,
            };
            const nextLength = Math.sqrt(nextVector.x ** 2 + nextVector.y ** 2);

            if (nextLength > 0) {
                const nextNormalized = {
                    x: nextVector.x / nextLength,
                    y: nextVector.y / nextLength,
                };

                // Set outHandle along the next segment direction to maintain straight line
                const outHandleLength = Math.min(nextLength / 3, displacementMagnitude * 0.8);
                endAnchor.outHandle = {
                    x: nextNormalized.x * outHandleLength,
                    y: nextNormalized.y * outHandleLength,
                };
            }
        }
    }

    // Update anchor types based on handles
    if (startAnchor.type === 'corner' && startAnchor.outHandle) {
        startAnchor.type = 'smooth';
    }

    if (endAnchor.type === 'corner' && endAnchor.inHandle) {
        endAnchor.type = 'smooth';
    }

    anchors[startIndex] = startAnchor;
    anchors[endIndex] = endAnchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    if (penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Translate a segment by moving both of its anchor points
 * Used when Shift+dragging a segment - moves the segment as a whole
 * without curving it, effectively "pulling" both endpoints together
 * 
 * @param segmentIndex - Index of the segment being translated
 * @param dragDelta - Delta from the original drag start position
 * @param originalPositions - Original positions of the segment anchors when drag started
 * @param getState - Function to get current canvas store state
 */
export function translateSegment(
    segmentIndex: number,
    dragDelta: Point,
    originalPositions: { start: Point; end: Point },
    getState: () => CanvasStore
): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath) {
        return;
    }

    const anchors = [...penState.currentPath.anchors];
    const startIndex = segmentIndex;
    const endIndex = (segmentIndex + 1) % anchors.length;

    if (startIndex < 0 || startIndex >= anchors.length) {
        return;
    }

    // Clone the anchors we're modifying
    const startAnchor = { ...anchors[startIndex] };
    const endAnchor = { ...anchors[endIndex] };

    // Calculate new positions from original positions + delta
    // This ensures consistent translation regardless of intermediate states
    startAnchor.position = {
        x: originalPositions.start.x + dragDelta.x,
        y: originalPositions.start.y + dragDelta.y,
    };

    endAnchor.position = {
        x: originalPositions.end.x + dragDelta.x,
        y: originalPositions.end.y + dragDelta.y,
    };

    // Note: Handles are relative to anchor positions, so they don't need adjustment
    // The segment shape (straight or curved) is preserved

    anchors[startIndex] = startAnchor;
    anchors[endIndex] = endAnchor;

    const updatedPath: PenPath = {
        ...penState.currentPath,
        anchors,
    };

    state.updatePenState?.({
        currentPath: updatedPath,
    });

    if (penState.editingPathId) {
        updatePathOnCanvas(updatedPath, penState.editingPathId, getState);
    }
}

/**
 * Save current path state to history (for undo/redo during drawing)
 * Should be called after any action that modifies the path
 */
export function savePathToHistory(getState: () => CanvasStore): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState?.currentPath || penState.mode !== 'drawing') {
        return;
    }

    // Deep clone the current path
    const pathSnapshot: PenPath = JSON.parse(JSON.stringify(penState.currentPath));

    // Get current history and index
    const currentHistory = penState.pathHistory || [];
    const currentIndex = penState.pathHistoryIndex ?? -1;

    // Truncate any redo states (everything after current index)
    const newHistory = currentHistory.slice(0, currentIndex + 1);

    // Add current state
    newHistory.push(pathSnapshot);

    // Limit history size to 50 states
    const maxHistorySize = 50;
    const trimmedHistory = newHistory.length > maxHistorySize
        ? newHistory.slice(newHistory.length - maxHistorySize)
        : newHistory;

    state.updatePenState?.({
        pathHistory: trimmedHistory,
        pathHistoryIndex: trimmedHistory.length - 1,
    });
}

/**
 * Undo the last path modification during drawing
 */
export function undoPathPoint(getState: () => CanvasStore): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState || penState.mode !== 'drawing') {
        return;
    }

    const history = penState.pathHistory || [];
    const currentIndex = penState.pathHistoryIndex ?? -1;

    // Can't undo if at the beginning
    if (currentIndex <= 0) {
        return;
    }

    const newIndex = currentIndex - 1;
    const previousPath: PenPath = JSON.parse(JSON.stringify(history[newIndex]));

    state.updatePenState?.({
        currentPath: previousPath,
        pathHistoryIndex: newIndex,
        activeAnchorIndex: previousPath.anchors.length - 1,
    });
}

/**
 * Redo a previously undone path modification during drawing
 */
export function redoPathPoint(getState: () => CanvasStore): void {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState || penState.mode !== 'drawing') {
        return;
    }

    const history = penState.pathHistory || [];
    const currentIndex = penState.pathHistoryIndex ?? -1;

    // Can't redo if at the end
    if (currentIndex >= history.length - 1) {
        return;
    }

    const newIndex = currentIndex + 1;
    const nextPath: PenPath = JSON.parse(JSON.stringify(history[newIndex]));

    state.updatePenState?.({
        currentPath: nextPath,
        pathHistoryIndex: newIndex,
        activeAnchorIndex: nextPath.anchors.length - 1,
    });
}

/**
 * Clear path history (call when starting a new path or finishing)
 */
export function clearPathHistory(getState: () => CanvasStore): void {
    const state = getState();
    state.updatePenState?.({
        pathHistory: [],
        pathHistoryIndex: -1,
    });
}

/**
 * Check if undo is available
 */
export function canUndoPath(getState: () => CanvasStore): boolean {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState || penState.mode !== 'drawing') {
        return false;
    }

    const currentIndex = penState.pathHistoryIndex ?? -1;
    return currentIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedoPath(getState: () => CanvasStore): boolean {
    const state = getState();
    const penState = (state as PenStore).pen;

    if (!penState || penState.mode !== 'drawing') {
        return false;
    }

    const history = penState.pathHistory || [];
    const currentIndex = penState.pathHistoryIndex ?? -1;
    return currentIndex < history.length - 1;
}
