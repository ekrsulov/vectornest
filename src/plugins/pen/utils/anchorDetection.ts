import type { Point, CanvasElement, PathElement } from '../../../types';
import type { PenPath } from '../types';
import { pathDataToPenPath } from './pathConverter';
import { distance } from '../../../utils/math';
import { closestPointOnLineSegment, closestPointOnCubicBezier } from '../../../utils/geometry';

const HIT_THRESHOLD = 8; // pixels

/**
 * Find a path element under the cursor
 */
export function findPathAtPoint(
    point: Point,
    elements: CanvasElement[],
    scale: number
): { pathId: string; penPath: PenPath; subPathIndex: number } | null {
    const threshold = HIT_THRESHOLD / scale;

    // Iterate elements in reverse (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (element.type !== 'path') continue;

        const pathElement = element as PathElement;

        // Check each subpath
        for (let subIndex = 0; subIndex < pathElement.data.subPaths.length; subIndex++) {
            const subPath = pathElement.data.subPaths[subIndex];
            const penPath = pathDataToPenPath(subPath, pathElement.id);

            // Check if point is close to any segment or anchor
            if (isPointNearPath(point, penPath, threshold)) {
                return { pathId: pathElement.id, penPath, subPathIndex: subIndex };
            }
        }
    }
    return null;
}

/**
 * Check if a point is near any part of the path
 */
function isPointNearPath(point: Point, path: PenPath, threshold: number): boolean {
    // Check anchors first
    if (findAnchorOnPath(point, path, threshold) !== null) return true;
    // Check segments
    if (findSegmentOnPath(point, path, threshold) !== null) return true;
    return false;
}

/**
 * Find a specific anchor on a path under the cursor
 */
export function findAnchorOnPath(
    point: Point,
    path: PenPath,
    threshold: number = HIT_THRESHOLD
): number | null {
    for (let i = 0; i < path.anchors.length; i++) {
        const anchor = path.anchors[i];
        const dist = distance(point, anchor.position);
        if (dist <= threshold) {
            return i;
        }
    }
    return null;
}

/**
 * Find a specific segment on a path under the cursor
 */
/**
 * Find a specific segment on a path under the cursor
 */
export function findSegmentOnPath(
    point: Point,
    path: PenPath,
    threshold: number = HIT_THRESHOLD
): { segmentIndex: number; t: number } | null {
    const anchors = path.anchors;
    if (anchors.length < 2) return null;

    // Iterate segments
    // If closed, we also check the closing segment
    const count = path.closed ? anchors.length : anchors.length - 1;

    for (let i = 0; i < count; i++) {
        const startAnchor = anchors[i];
        const endAnchor = anchors[(i + 1) % anchors.length];

        // Check if segment is straight or curved
        const isCurved = startAnchor.outHandle || endAnchor.inHandle;

        if (isCurved) {
            // Bezier curve distance check
            const cp1 = startAnchor.outHandle
                ? addPoints(startAnchor.position, startAnchor.outHandle)
                : startAnchor.position;
            const cp2 = endAnchor.inHandle
                ? addPoints(endAnchor.position, endAnchor.inHandle)
                : endAnchor.position;

            const result = closestPointOnCubicBezier(
                point,
                startAnchor.position,
                cp1,
                cp2,
                endAnchor.position
            );

            if (result.distance <= threshold) {
                return { segmentIndex: i, t: result.t };
            }
        } else {
            // Straight line distance check
            const result = closestPointOnLineSegment(
                point,
                startAnchor.position,
                endAnchor.position
            );

            if (result.distance <= threshold) {
                return { segmentIndex: i, t: result.t };
            }
        }
    }

    return null;
}

// --- Helper Functions ---

function addPoints(p1: Point, p2: Point): Point {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
 * Find a handle on a path under the cursor
 * Returns the anchor index and handle type if found
 */
export function findHandleOnPath(
    point: Point,
    path: PenPath,
    scale: number
): { anchorIndex: number; handleType: 'in' | 'out' } | null {
    const threshold = HIT_THRESHOLD / scale;

    for (let i = 0; i < path.anchors.length; i++) {
        const anchor = path.anchors[i];

        // Check outHandle
        if (anchor.outHandle) {
            const handlePos = addPoints(anchor.position, anchor.outHandle);
            const dist = distance(point, handlePos);
            if (dist <= threshold) {
                return { anchorIndex: i, handleType: 'out' };
            }
        }

        // Check inHandle
        if (anchor.inHandle) {
            const handlePos = addPoints(anchor.position, anchor.inHandle);
            const dist = distance(point, handlePos);
            if (dist <= threshold) {
                return { anchorIndex: i, handleType: 'in' };
            }
        }
    }

    return null;
}
