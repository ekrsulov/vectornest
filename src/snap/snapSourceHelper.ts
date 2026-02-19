/**
 * Shared Snap Source Helper
 * 
 * Provides common snap point aggregation logic for plugin-specific snap sources.
 * Used by ArrowsSnapSource and MeasureSnapSource to avoid code duplication.
 */

import type { SnapContext, SnapPoint } from './types';
import type { Point, CanvasElement, GroupElement } from '../types';
import type { SnapPointsSlice } from '../store/slices/features/snapPointsSlice';
import {
    getAllSnapPoints,
    findClosestSnapPoint,
    findPathSnapPoint
} from '../utils/snapPointUtils';
import { screenDistance } from '../utils/math';
import { getCanvasElementBounds } from '../utils/canvasElementBounds';
import { buildElementMap } from '../utils/elementMapUtils';

/**
 * Configuration for snap point collection
 */
interface SnapSourceConfig {
    /** Unique identifier for this snap source */
    sourceId: string;
    /** Whether snapping is enabled for this source */
    enableSnapping: boolean;
    /** All canvas elements */
    elements: CanvasElement[];
    /** Global snap points configuration */
    snapPointsConfig: SnapPointsSlice['snapPoints'] | undefined;
    /** Element IDs to exclude from intersection calculations */
    excludeElementIds?: string[];
    /** Commands to exclude from path snapping */
    excludeCommands?: Array<{ subpathIndex: number; commandIndex: number }>;
    /** ID of the element being edited (for excludeCommands) */
    editElementId?: string;
    /** Optional filter function to post-process snap points */
    filterSnapPoints?: (snapPoints: SnapPoint[]) => SnapPoint[];
    /** Optional list of element IDs to skip for path-edge snapping */
    skipPathElementIds?: string[];
}

/**
 * Collect snap points for a given cursor position using global snap settings.
 * This is the shared implementation used by arrows and measure snap sources.
 * 
 * @param context - The snap context with viewport information
 * @param point - The cursor position in canvas coordinates
 * @param config - Configuration for this snap source
 * @returns Array of snap points near the cursor
 */
export function collectSnapPoints(
    context: SnapContext,
    point: Point,
    config: SnapSourceConfig
): SnapPoint[] {
    const { sourceId, enableSnapping, elements, snapPointsConfig, excludeElementIds, excludeCommands, editElementId, filterSnapPoints, skipPathElementIds } = config;

    if (!enableSnapping) return [];

    // Build element map for group handling
    const elementMap = buildElementMap(elements);

    // Get bounds function
    const getElementBounds = (element: CanvasElement) =>
        getCanvasElementBounds(element, {
            viewport: context.viewport,
            elementMap,
        });

    // Get all candidate snap points based on global snap settings
    const availableSnapPoints = getAllSnapPoints(elements, getElementBounds, {
        snapToAnchors: snapPointsConfig?.snapToAnchors ?? true,
        snapToMidpoints: snapPointsConfig?.snapToMidpoints ?? true,
        snapToBBoxCorners: snapPointsConfig?.snapToBBoxCorners ?? true,
        snapToBBoxCenter: snapPointsConfig?.snapToBBoxCenter ?? true,
        snapToIntersections: snapPointsConfig?.snapToIntersections ?? true,
        excludeElementIds,
        elementMap,
        getGroupBounds: (group: GroupElement, elMap: Map<string, CanvasElement>) =>
            getCanvasElementBounds(group, {
                viewport: context.viewport,
                elementMap: elMap,
            })
    });

    // Apply post-filter if provided
    const filteredSnapPoints = filterSnapPoints ? filterSnapPoints(availableSnapPoints) : availableSnapPoints;

    const threshold = snapPointsConfig?.snapThreshold ?? 10;
    const thresholdInCanvas = threshold / context.viewport.zoom;

    // Find closest high-priority snap point
    const closestSnap = findClosestSnapPoint(point, filteredSnapPoints, thresholdInCanvas, 1);

    // Edge snap (only if no high-priority snap found and edge snap is enabled)
    let pathSnap: ReturnType<typeof findPathSnapPoint> = null;
    if ((snapPointsConfig?.snapToPath ?? true) && !closestSnap) {
        const skipSet = skipPathElementIds ? new Set(skipPathElementIds) : null;
        let closestDistance = Infinity;
        for (const element of elements) {
            if (skipSet?.has(element.id)) {
                continue;
            }
            const elementExcludeCommands = (excludeCommands && element.id === editElementId) ? excludeCommands : undefined;
            const snap = findPathSnapPoint(point, element, threshold, context.viewport.zoom, { excludeCommands: elementExcludeCommands });
            if (snap) {
                const dist = screenDistance(point, snap.point, context.viewport.zoom);
                if (dist < closestDistance) {
                    closestDistance = dist;
                    pathSnap = snap;
                }
            }
        }
    }

    const result: SnapPoint[] = [];

    if (closestSnap) {
        // Convert legacy SnapPoint to centralized SnapPoint format
        result.push({
            id: `${sourceId}-${closestSnap.type}-${closestSnap.point.x}-${closestSnap.point.y}`,
            point: { x: closestSnap.point.x, y: closestSnap.point.y },
            type: closestSnap.type as SnapPoint['type'],
            priority: 100,
            sourceId,
            metadata: { original: closestSnap }
        });
    } else if (pathSnap) {
        result.push({
            id: `${sourceId}-path-${pathSnap.point.x}-${pathSnap.point.y}`,
            point: { x: pathSnap.point.x, y: pathSnap.point.y },
            type: 'path',
            priority: 90,
            sourceId,
            metadata: { original: pathSnap }
        });
    }

    return result;
}
