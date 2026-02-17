import type { Point, CanvasElement, Command, GroupElement, PathData } from '../../types';
import type { Bounds } from '../boundsUtils';
import { screenDistance, closestPointOnSegment, bezierPoint, lineSegmentIntersection } from '../math';
import type { SnapPoint, SnapPointOptions, PathSnapOptions } from './types';
import { extractAnchorPoints, extractMidpoints, extractBBoxPoints, extractLineSegments, getCommandEndpoint } from './extraction';

/**
 * Find closest point on path edges to a given position
 */
export function findPathSnapPoint(
    position: Point,
    element: CanvasElement,
    threshold: number,
    zoom: number,
    options?: PathSnapOptions
): SnapPoint | null {
    if (element.type !== 'path' || !element.data?.subPaths) return null;

    let closestPoint: SnapPoint | null = null;
    let closestDistance = threshold;

    let currentPoint: Point | null = null;
    let globalCommandIndex = 0;

    // Helper to check if a command should be excluded
    const shouldExcludeCommand = (cmdIndex: number): boolean => {
        if (!options?.excludeCommands) return false;
        return options.excludeCommands.some((exc: { subpathIndex: number; commandIndex: number }) => exc.commandIndex === cmdIndex);
    };

    const pathData = element.data as PathData;

    for (let subpathIndex = 0; subpathIndex < pathData.subPaths.length; subpathIndex++) {
        const subPath = pathData.subPaths[subpathIndex];
        let subPathStartPoint: Point | null = null;

        for (let localCommandIndex = 0; localCommandIndex < subPath.length; localCommandIndex++) {
            const command = subPath[localCommandIndex];
            const endpoint = getCommandEndpoint(command);

            if (command.type === 'M') {
                currentPoint = endpoint;
                subPathStartPoint = endpoint;
            } else if (command.type === 'L' && currentPoint && endpoint) {
                // Skip this segment if the command is in the exclude list
                // A segment at commandIndex N connects from commandIndex N-1 to N
                if (!shouldExcludeCommand(globalCommandIndex)) {
                    // Find closest point on line segment
                    const snapPoint = closestPointOnSegment(position, currentPoint, endpoint);
                    const dist = screenDistance(position, snapPoint, zoom);

                    if (dist < closestDistance) {
                        closestDistance = dist;
                        closestPoint = {
                            point: snapPoint,
                            type: 'path',
                            elementId: element.id,
                        };
                    }
                }

                currentPoint = endpoint;
            } else if (command.type === 'C' && currentPoint && endpoint) {
                // Skip this segment if the command is in the exclude list
                if (!shouldExcludeCommand(globalCommandIndex)) {
                    // For curves, approximate with multiple segments
                    const c = command as Extract<Command, { type: 'C' }>;
                    const steps = 10;
                    let prevPoint = currentPoint;

                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const curvePoint = bezierPoint(currentPoint, c.controlPoint1, c.controlPoint2, c.position, t);

                        const snapPoint = closestPointOnSegment(position, prevPoint, curvePoint);
                        const dist = screenDistance(position, snapPoint, zoom);

                        if (dist < closestDistance) {
                            closestDistance = dist;
                            closestPoint = {
                                point: snapPoint,
                                type: 'path',
                                elementId: element.id,
                            };
                        }

                        prevPoint = curvePoint;
                    }
                }

                currentPoint = endpoint;
            } else if (command.type === 'Z' && currentPoint && subPathStartPoint) {
                // Z command creates a closing segment back to the start
                // Skip if this closing segment is in the exclude list
                if (!shouldExcludeCommand(globalCommandIndex)) {
                    const snapPoint = closestPointOnSegment(position, currentPoint, subPathStartPoint);
                    const dist = screenDistance(position, snapPoint, zoom);

                    if (dist < closestDistance) {
                        closestDistance = dist;
                        closestPoint = {
                            point: snapPoint,
                            type: 'path',
                            elementId: element.id,
                        };
                    }
                }
                currentPoint = subPathStartPoint;
            } else if (endpoint) {
                currentPoint = endpoint;
            }

            globalCommandIndex++;
        }
    }

    return closestPoint;
}

/**
 * Compute axis-aligned bounding box from line segments.
 */
function segmentsBounds(segments: Array<{ start: Point; end: Point }>): Bounds | null {
    if (segments.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { start, end } of segments) {
        if (start.x < minX) minX = start.x;
        if (start.y < minY) minY = start.y;
        if (start.x > maxX) maxX = start.x;
        if (start.y > maxY) maxY = start.y;
        if (end.x < minX) minX = end.x;
        if (end.y < minY) minY = end.y;
        if (end.x > maxX) maxX = end.x;
        if (end.y > maxY) maxY = end.y;
    }
    return { minX, minY, maxX, maxY };
}

/**
 * Check if two AABBs overlap.
 */
function boundsOverlap(a: Bounds, b: Bounds): boolean {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Find all intersection points between line segments of different elements
 * @param elements Elements to find intersections between
 * @param excludeElementIds Optional list of element IDs to exclude from both sides of intersection calculation
 */
export function findIntersections(
    elements: CanvasElement[],
    excludeElementIds?: string[]
): SnapPoint[] {
    const intersections: SnapPoint[] = [];
    const seen = new Set<string>(); // To avoid duplicates

    // Filter out excluded elements
    const validElements = excludeElementIds
        ? (() => { const excludeSet = new Set(excludeElementIds); return elements.filter(el => !excludeSet.has(el.id)); })()
        : elements;

    // Pre-compute segments and bounds for each element
    const elementSegments = validElements.map(el => extractLineSegments(el));
    const elementBounds = elementSegments.map(segs => segmentsBounds(segs));

    // Compare each pair of elements
    for (let i = 0; i < validElements.length; i++) {
        const segments1 = elementSegments[i];
        const bounds1 = elementBounds[i];
        if (!bounds1 || segments1.length === 0) continue;

        for (let j = i + 1; j < validElements.length; j++) {
            const segments2 = elementSegments[j];
            const bounds2 = elementBounds[j];
            if (!bounds2 || segments2.length === 0) continue;

            // Skip element pairs whose bounding boxes don't overlap
            if (!boundsOverlap(bounds1, bounds2)) continue;

            // Check each segment pair
            for (const seg1 of segments1) {
                for (const seg2 of segments2) {
                    const intersection = lineSegmentIntersection(
                        seg1.start, seg1.end,
                        seg2.start, seg2.end
                    );

                    if (intersection) {
                        // Create unique key to avoid duplicates
                        const key = `${intersection.x.toFixed(6)},${intersection.y.toFixed(6)}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            intersections.push({
                                point: intersection,
                                type: 'intersection',
                                elementId: validElements[i].id,
                            });
                        }
                    }
                }
            }
        }
    }

    return intersections;
}

/**
 * Get all snap points from elements based on options
 * Note: Edge snap is NOT included here as it's computed on-demand per position
 */
export function getAllSnapPoints(
    elements: CanvasElement[],
    getElementBounds: (element: CanvasElement) => Bounds | null,
    options: SnapPointOptions = {}
): SnapPoint[] {
    const {
        snapToAnchors = true,
        snapToMidpoints = true,
        snapToBBoxCorners = true,
        snapToBBoxCenter = true,
        snapToIntersections = true,
        excludeElementIds,
        elementMap,
        getGroupBounds,
    } = options;

    const allPoints: SnapPoint[] = [];

    // Track which root groups we've already processed
    const processedRootGroups = new Set<string>();

    // Helper to find root group ID for an element
    const findRootGroupId = (element: CanvasElement): string | null => {
        if (!elementMap || !element.parentId) return null;

        let currentId: string | null = element.parentId;
        let rootGroupId: string = currentId;

        while (currentId) {
            const parent = elementMap.get(currentId);
            if (!parent) break;
            rootGroupId = currentId;
            currentId = parent.parentId;
        }

        return rootGroupId;
    };

    for (const element of elements) {
        // Skip group elements themselves (we process their children)
        if (element.type === 'group') continue;

        // Check if element belongs to a group
        const rootGroupId = findRootGroupId(element);

        if (rootGroupId && elementMap && getGroupBounds) {
            const groupId = rootGroupId;
            // Element is part of a group - only add bbox points for the root group (once)
            if (!processedRootGroups.has(groupId)) {
                processedRootGroups.add(groupId);

                const rootGroup = elementMap.get(groupId);
                if (rootGroup && rootGroup.type === 'group') {
                    const groupBounds = getGroupBounds(rootGroup as GroupElement, elementMap);
                    if (groupBounds && (snapToBBoxCorners || snapToBBoxCenter)) {
                        // Add group bbox points (corners and center only, no midpoints for groups)
                        allPoints.push(
                            ...extractBBoxPoints(rootGroup, groupBounds, {
                                includeCorners: snapToBBoxCorners,
                                includeCenter: snapToBBoxCenter,
                                includeMidpoints: false, // No midpoints for group bboxes
                            })
                        );
                    }
                }
            }
            // Skip individual snap points for grouped elements
            continue;
        }

        // Element is NOT part of a group - process normally
        // Extract anchor points
        if (snapToAnchors) {
            allPoints.push(...extractAnchorPoints(element));
        }

        // Extract midpoints from curves and lines
        if (snapToMidpoints) {
            allPoints.push(...extractMidpoints(element));
        }

        // Extract bbox points
        if (snapToBBoxCorners || snapToBBoxCenter || snapToMidpoints) {
            const bounds = getElementBounds(element);
            if (bounds) {
                allPoints.push(
                    ...extractBBoxPoints(element, bounds, {
                        includeCorners: snapToBBoxCorners,
                        includeCenter: snapToBBoxCenter,
                        includeMidpoints: snapToMidpoints,
                    })
                );
            }
        }
    }

    // Find intersections between elements (excluding specified elements)
    if (snapToIntersections && elements.length > 1) {
        // Filter to only ungrouped elements for intersection calculation
        const ungroupedElements = elementMap
            ? elements.filter(el => el.type !== 'group' && !findRootGroupId(el))
            : elements.filter(el => el.type !== 'group');

        if (ungroupedElements.length > 1) {
            allPoints.push(...findIntersections(ungroupedElements, excludeElementIds));
        }
    }

    return allPoints;
}

/**
 * Find the closest snap point to a given position within a threshold
 */
export function findClosestSnapPoint(
    position: Point,
    snapPoints: SnapPoint[],
    threshold: number,
    zoom: number
): SnapPoint | null {
    let closestPoint: SnapPoint | null = null;
    let minDistance = threshold;

    for (const snapPoint of snapPoints) {
        const dist = screenDistance(position, snapPoint.point, zoom);

        if (dist < minDistance) {
            minDistance = dist;
            closestPoint = snapPoint;
        }
    }

    return closestPoint;
}

/**
 * Find snap point from cursor position
 */
export function findSnapPoint(
    point: Point,
    elements: CanvasElement[],
    getElementBounds: (element: CanvasElement) => Bounds | null,
    threshold: number,
    zoom: number,
    options: SnapPointOptions = {}
): SnapPoint | null {
    const { snapToPath = false } = options;

    // Get all static snap points
    const allPoints = getAllSnapPoints(elements, getElementBounds, options);
    let closestSnap = findClosestSnapPoint(point, allPoints, threshold, zoom);
    let closestDistance = closestSnap ? screenDistance(point, closestSnap.point, zoom) : Infinity;

    // Check edge snap (dynamic, computed per element)
    if (snapToPath) {
        for (const element of elements) {
            const pathSnap = findPathSnapPoint(point, element, threshold, zoom, options as PathSnapOptions);
            if (pathSnap) {
                const dist = screenDistance(point, pathSnap.point, zoom);
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestSnap = pathSnap;
                }
            }
        }
    }

    return closestSnap;
}
