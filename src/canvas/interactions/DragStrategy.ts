import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { extractEditablePoints, updateCommands, extractSubpaths, getControlPointAlignmentInfo } from '../../utils/pathParserUtils';
import { svgToCanvas } from '../../utils/pointUtils';
import { pluginManager } from '../../utils/pluginManager';
import { logger } from '../../utils/logger';
import type { CanvasElement, SubPath, ControlPointInfo, Command, PathData } from '../../types';
import { getDragPointInfo } from '../../utils/dragUtils';
import { type DragContext as PluginDragContext, type DragPointInfo } from '../../types/extensionPoints';
import type { PointDragContext as ModifierDragContext } from '../../types/interaction';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { inverseMatrix, applyToPoint } from '../../utils/matrixUtils';
import { buildElementMap } from '../../utils/elementMapUtils';

let cachedCanvasSvgRef: WeakRef<SVGSVGElement> | null = null;

const resolveCanvasSvgElement = (): SVGSVGElement | null => {
    const cached = cachedCanvasSvgRef?.deref();
    if (cached && cached.isConnected) {
        return cached;
    }

    const foundElement = document.querySelector('svg[data-canvas="true"]');
    if (!foundElement && import.meta.env.DEV) {
        logger.warn('[DragStrategy] No SVG element with data-canvas="true" found');
    }
    const svgElement = foundElement as SVGSVGElement | null;
    cachedCanvasSvgRef = svgElement ? new WeakRef(svgElement) : null;
    return svgElement;
};

export interface DragSelectionState {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
        elementId: string;
        commandIndex: number;
        pointIndex: number;
        x: number;
        y: number;
    }>;
    startX: number;
    startY: number;
}

export interface DragSubpathState {
    isDragging: boolean;
    initialPositions: Array<{
        elementId: string;
        subpathIndex: number;
        bounds: { minX: number; minY: number; maxX: number; maxY: number };
        originalCommands: Command[];
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
}

export interface DragCallbacks {
    onStopDraggingPoint: () => void;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => ControlPointInfo | null;
}

export const calculateDragPosition = (
    e: MouseEvent,
    viewport: { zoom: number; panX: number; panY: number },
    dragContext?: PluginDragContext | null
): { canvasX: number; canvasY: number } | null => {
    const svgElement = resolveCanvasSvgElement();
    if (!svgElement) return null;

    const svgRect = svgElement.getBoundingClientRect();
    const svgX = e.clientX - svgRect.left;
    const svgY = e.clientY - svgRect.top;

    const canvasPoint = svgToCanvas(svgX, svgY, viewport, { applyPrecision: true });
    const canvasX = canvasPoint.x;
    const canvasY = canvasPoint.y;

    // Apply drag modifiers
    const modifiers = pluginManager.getDragModifiers();
    let modifiedPoint = { x: canvasX, y: canvasY };

    const excludeElementIds: string[] = dragContext?.excludeElementIds
        ? [...dragContext.excludeElementIds]
        : dragContext?.elementIds
            ? [...dragContext.elementIds]
            : [];

    // Build dragPointInfo for precise point exclusion from snap
    const dragPointInfo = getDragPointInfo(dragContext);

    const modifierContext: ModifierDragContext = {
        originalPoint: { x: canvasX, y: canvasY },
        excludeElementIds,
        dragPointInfo,
    };

    for (const modifier of modifiers) {
        modifiedPoint = modifier.modify(modifiedPoint, modifierContext);
    }

    return { canvasX: modifiedPoint.x, canvasY: modifiedPoint.y };
};

/**
 * Transforms a point from global canvas coordinates to the local coordinate space of an element.
 * This is necessary when the element is inside a group that has transformations (rotation, scale, etc.)
 */
const transformToLocalCoordinates = (
    globalX: number,
    globalY: number,
    element: CanvasElement,
    elements: CanvasElement[] | Map<string, CanvasElement>
): { x: number; y: number } => {
    // Get the accumulated transform matrix from parent groups
    const parentMatrix = getParentCumulativeTransformMatrix(element, elements);
    const invParent = inverseMatrix(parentMatrix);
    
    if (!invParent) {
        // Matrix is not invertible (e.g., scale 0), return original coordinates
        return { x: globalX, y: globalY };
    }
    
    // Transform the point to local coordinates
    return applyToPoint(invParent, { x: globalX, y: globalY });
};

/**
 * Transforms a delta vector from global canvas coordinates to the local coordinate space of an element.
 * This preserves the magnitude and direction of the delta relative to the element's local space.
 */
const transformDeltaToLocal = (
    deltaX: number,
    deltaY: number,
    element: CanvasElement,
    elements: CanvasElement[] | Map<string, CanvasElement>
): { x: number; y: number } => {
    // Get the accumulated transform matrix from parent groups
    const parentMatrix = getParentCumulativeTransformMatrix(element, elements);
    const invParent = inverseMatrix(parentMatrix);
    
    if (!invParent) {
        // Matrix is not invertible, return original delta
        return { x: deltaX, y: deltaY };
    }
    
    // Transform delta by applying inverse to both origin and delta point, then subtracting
    // This correctly handles rotation, scale, and skew
    const p0 = applyToPoint(invParent, { x: 0, y: 0 });
    const p1 = applyToPoint(invParent, { x: deltaX, y: deltaY });
    
    return { x: p1.x - p0.x, y: p1.y - p0.y };
};

export const updateSinglePointPath = (
    dragPoint: DragPointInfo,
    canvasX: number,
    canvasY: number,
    elements: CanvasElement[],
    callbacks: DragCallbacks,
    elementMap?: Map<string, CanvasElement>
) => {
    const elementsById = elementMap ?? buildElementMap(elements);
    const element = elementsById.get(dragPoint.elementId);
    if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);

        const pointToUpdate = points.find(p =>
            p.commandIndex === (dragPoint.commandIndex ?? dragPoint.pointIndex ?? 0) &&
            p.pointIndex === (dragPoint.pointIndex ?? dragPoint.commandIndex ?? 0)
        );

        if (pointToUpdate) {
            // Transform global canvas coordinates to local element coordinates
            // This handles the case when the path is inside a group with transformations
            const localCoords = transformToLocalCoordinates(canvasX, canvasY, element, elementsById);
            const newX = formatToPrecision(localCoords.x, PATH_DECIMAL_PRECISION);
            const newY = formatToPrecision(localCoords.y, PATH_DECIMAL_PRECISION);

            const pointsToUpdate = [pointToUpdate];

            // Handle control point alignment logic
            if (pointToUpdate.isControl) {
                const alignmentInfo = getControlPointAlignmentInfo(
                    commands,
                    points,
                    dragPoint.commandIndex ?? dragPoint.pointIndex ?? 0,
                    dragPoint.pointIndex ?? dragPoint.commandIndex ?? 0
                );

                if (alignmentInfo && (alignmentInfo.type === 'aligned' || alignmentInfo.type === 'mirrored')) {
                    const pairedCommandIndex = alignmentInfo.pairedCommandIndex;
                    const pairedPointIndex = alignmentInfo.pairedPointIndex;
                    const anchor = alignmentInfo.anchor;

                    if (pairedCommandIndex !== undefined && pairedPointIndex !== undefined) {
                        const currentVector = {
                            x: newX - anchor.x,
                            y: newY - anchor.y
                        };
                        const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);

                        if (magnitude > 0) {
                            const unitVector = {
                                x: currentVector.x / magnitude,
                                y: currentVector.y / magnitude
                            };

                            let pairedX: number;
                            let pairedY: number;

                            if (alignmentInfo.type === 'mirrored') {
                                pairedX = anchor.x + (-unitVector.x * magnitude);
                                pairedY = anchor.y + (-unitVector.y * magnitude);
                            } else {
                                const pairedPoint = points.find(p =>
                                    p.commandIndex === pairedCommandIndex &&
                                    p.pointIndex === pairedPointIndex
                                );
                                if (pairedPoint) {
                                    const originalVector = {
                                        x: pairedPoint.x - anchor.x,
                                        y: pairedPoint.y - anchor.y
                                    };
                                    const originalMagnitude = Math.sqrt(originalVector.x * originalVector.x + originalVector.y * originalVector.y);
                                    pairedX = anchor.x + (-unitVector.x * originalMagnitude);
                                    pairedY = anchor.y + (-unitVector.y * originalMagnitude);
                                } else {
                                    pairedX = anchor.x + (-unitVector.x * magnitude);
                                    pairedY = anchor.y + (-unitVector.y * magnitude);
                                }
                            }

                            const pairedPointToUpdate = points.find(p =>
                                p.commandIndex === pairedCommandIndex &&
                                p.pointIndex === pairedPointIndex
                            );
                            if (pairedPointToUpdate) {
                                pairedPointToUpdate.x = formatToPrecision(pairedX, PATH_DECIMAL_PRECISION);
                                pairedPointToUpdate.y = formatToPrecision(pairedY, PATH_DECIMAL_PRECISION);
                                pointsToUpdate.push(pairedPointToUpdate);
                            }
                        }
                    }
                }
            }

            pointToUpdate.x = newX;
            pointToUpdate.y = newY;

            const updatedCommands = updateCommands(commands, pointsToUpdate);
            const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);
            callbacks.onUpdateElement(dragPoint.elementId, {
                data: {
                    ...pathData,
                    subPaths: newSubPaths
                }
            });
        }
    }
};

export const updateGroupDragPaths = (
    draggingSelection: DragSelectionState,
    canvasX: number,
    canvasY: number,
    elements: CanvasElement[],
    originalPathDataMap: Record<string, SubPath[]> | null,
    callbacks: DragCallbacks,
    elementMap?: Map<string, CanvasElement>
) => {
    const elementsById = elementMap ?? buildElementMap(elements);

    // Global delta in canvas coordinates
    const globalDeltaX = canvasX - draggingSelection.startX;
    const globalDeltaY = canvasY - draggingSelection.startY;

    if (originalPathDataMap) {
        const elementUpdates: Record<string, Array<{
            commandIndex: number;
            pointIndex: number;
            x: number;
            y: number;
            isControl: boolean;
        }>> = {};

        // Cache for local deltas per element (to avoid recalculating for each point)
        const localDeltaCache: Record<string, { x: number; y: number }> = {};

        draggingSelection.initialPositions.forEach(initialPos => {
            if (!elementUpdates[initialPos.elementId]) {
                elementUpdates[initialPos.elementId] = [];
            }

            // Get or calculate local delta for this element
            if (!localDeltaCache[initialPos.elementId]) {
                const element = elementsById.get(initialPos.elementId);
                if (element) {
                    // Transform the global delta to local coordinates for this element
                    localDeltaCache[initialPos.elementId] = transformDeltaToLocal(
                        globalDeltaX,
                        globalDeltaY,
                        element,
                        elementsById
                    );
                } else {
                    // Fallback to global delta if element not found
                    localDeltaCache[initialPos.elementId] = { x: globalDeltaX, y: globalDeltaY };
                }
            }

            const localDelta = localDeltaCache[initialPos.elementId];

            elementUpdates[initialPos.elementId].push({
                commandIndex: initialPos.commandIndex,
                pointIndex: initialPos.pointIndex,
                x: formatToPrecision(initialPos.x + localDelta.x, PATH_DECIMAL_PRECISION),
                y: formatToPrecision(initialPos.y + localDelta.y, PATH_DECIMAL_PRECISION),
                isControl: false
            });
        });

        Object.entries(elementUpdates).forEach(([elementId, updates]) => {
            const originalSubPaths = originalPathDataMap[elementId];
            if (originalSubPaths) {
                const originalCommands = originalSubPaths.flat();
                const updatedCommands = updateCommands(originalCommands, updates.map(u => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } })));
                const newSubPaths = extractSubpaths(updatedCommands).map(sp => sp.commands);

                const element = elementsById.get(elementId);
                if (element) {
                    callbacks.onUpdateElement(elementId, {
                        data: {
                            ...(element.data as PathData),
                            subPaths: newSubPaths
                        }
                    });
                }
            }
        });
    }
};
