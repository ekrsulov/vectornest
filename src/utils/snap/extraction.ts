import type { Point, CanvasElement, Command, PathData } from '../../types';
import type { Bounds } from '../boundsUtils';
import { midpoint, bezierPoint } from '../math';
import type { SnapPoint } from './types';

/**
 * Get the endpoint of a command
 */
export function getCommandEndpoint(command: Command): Point | null {
    if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
        return command.position;
    }
    return null;
}

/**
 * Extract anchor points from a path element
 */
export function extractAnchorPoints(element: CanvasElement): SnapPoint[] {
    if (element.type !== 'path') return [];
    const pathData = element.data as PathData;

    const points: SnapPoint[] = [];
    let globalCommandIndex = 0; // Track global command index across all subpaths

    for (let subpathIndex = 0; subpathIndex < pathData.subPaths.length; subpathIndex++) {
        const subPath = pathData.subPaths[subpathIndex];
        for (let localCommandIndex = 0; localCommandIndex < subPath.length; localCommandIndex++) {
            const command = subPath[localCommandIndex];

            // M, L, and C commands have anchor points at their position
            if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
                points.push({
                    point: command.position,
                    type: 'anchor',
                    elementId: element.id,
                    metadata: {
                        subpathIndex,
                        commandIndex: globalCommandIndex, // Use global index to match editingPoint.commandIndex
                        pointIndex: 0,
                    },
                });
            }
            globalCommandIndex++;
        }
    }

    return points;
}

/**
 * Extract midpoints from lines and curves in a path element
 */
export function extractMidpoints(element: CanvasElement): SnapPoint[] {
    if (element.type !== 'path') return [];
    const pathData = element.data as PathData;

    const points: SnapPoint[] = [];
    let currentPoint: Point | null = null;
    let startPoint: Point | null = null;
    let globalCommandIndex = 0; // Track global command index across all subpaths

    for (let subpathIndex = 0; subpathIndex < pathData.subPaths.length; subpathIndex++) {
        const subPath = pathData.subPaths[subpathIndex];
        for (let localCommandIndex = 0; localCommandIndex < subPath.length; localCommandIndex++) {
            const command = subPath[localCommandIndex];
            const endpoint = getCommandEndpoint(command);

            if (command.type === 'M') {
                currentPoint = endpoint;
                startPoint = endpoint;
            } else if (command.type === 'L' && currentPoint && endpoint) {
                // Midpoint of line segment
                const mid = midpoint(currentPoint, endpoint);
                points.push({
                    point: mid,
                    type: 'midpoint',
                    elementId: element.id,
                    metadata: { subpathIndex, commandIndex: globalCommandIndex },
                });
                currentPoint = endpoint;
            } else if (command.type === 'C' && currentPoint && endpoint) {
                // Midpoint of cubic Bezier curve at t=0.5
                const c = command as Extract<Command, { type: 'C' }>;
                const mid = bezierPoint(currentPoint, c.controlPoint1, c.controlPoint2, c.position, 0.5);
                points.push({
                    point: mid,
                    type: 'midpoint',
                    elementId: element.id,
                    metadata: { subpathIndex, commandIndex: globalCommandIndex },
                });
                currentPoint = endpoint;
            } else if (command.type === 'Z' && currentPoint && startPoint) {
                // Midpoint of closing segment
                const mid = midpoint(currentPoint, startPoint);
                points.push({
                    point: mid,
                    type: 'midpoint',
                    elementId: element.id,
                    metadata: { subpathIndex, commandIndex: globalCommandIndex },
                });
                currentPoint = startPoint;
            } else if (endpoint) {
                currentPoint = endpoint;
            }
            globalCommandIndex++;
        }
    }

    return points;
}

/**
 * Extract bounding box snap points (corners and center)
 */
export function extractBBoxPoints(
    element: CanvasElement,
    bounds: Bounds,
    options: { includeCorners?: boolean; includeCenter?: boolean; includeMidpoints?: boolean } = {}
): SnapPoint[] {
    const {
        includeCorners = true,
        includeCenter = true,
        includeMidpoints = true
    } = options;

    const points: SnapPoint[] = [];
    const { minX, minY, maxX, maxY } = bounds;

    if (includeCorners) {
        // Four corners
        points.push(
            { point: { x: minX, y: minY }, type: 'bbox-corner', elementId: element.id },
            { point: { x: maxX, y: minY }, type: 'bbox-corner', elementId: element.id },
            { point: { x: maxX, y: maxY }, type: 'bbox-corner', elementId: element.id },
            { point: { x: minX, y: maxY }, type: 'bbox-corner', elementId: element.id }
        );
    }

    if (includeMidpoints) {
        // Four edge midpoints
        points.push(
            { point: { x: (minX + maxX) / 2, y: minY }, type: 'midpoint', elementId: element.id },
            { point: { x: maxX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id },
            { point: { x: (minX + maxX) / 2, y: maxY }, type: 'midpoint', elementId: element.id },
            { point: { x: minX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id }
        );
    }

    if (includeCenter) {
        // Center point
        points.push({
            point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
            type: 'bbox-center',
            elementId: element.id,
        });
    }

    return points;
}

/** Number of line segments used to approximate a cubic Bézier curve. */
const BEZIER_APPROXIMATION_SEGMENTS = 8;

/**
 * Extract line segments from a path element.
 * Cubic Bézier curves are approximated as polylines.
 */
export function extractLineSegments(element: CanvasElement): Array<{ start: Point; end: Point }> {
    if (element.type !== 'path' || !element.data?.subPaths) return [];
    const pathData = element.data as PathData;

    const segments: Array<{ start: Point; end: Point }> = [];
    let currentPoint: Point | null = null;
    let startPoint: Point | null = null;

    for (const subPath of pathData.subPaths) {
        for (const command of subPath) {
            const endpoint = getCommandEndpoint(command);

            if (command.type === 'M') {
                currentPoint = endpoint;
                startPoint = endpoint;
            } else if (command.type === 'L' && currentPoint && endpoint) {
                segments.push({ start: currentPoint, end: endpoint });
                currentPoint = endpoint;
            } else if (command.type === 'C' && currentPoint && endpoint) {
                // Approximate the cubic Bézier with a polyline
                const p0 = currentPoint;
                const p1 = command.controlPoint1;
                const p2 = command.controlPoint2;
                const p3 = endpoint;
                let prev = p0;
                for (let k = 1; k <= BEZIER_APPROXIMATION_SEGMENTS; k++) {
                    const t = k / BEZIER_APPROXIMATION_SEGMENTS;
                    const pt = bezierPoint(p0, p1, p2, p3, t);
                    segments.push({ start: prev, end: pt });
                    prev = pt;
                }
                currentPoint = endpoint;
            } else if (command.type === 'Z' && currentPoint && startPoint) {
                // Close the path
                segments.push({ start: currentPoint, end: startPoint });
                currentPoint = startPoint;
            } else if (endpoint) {
                currentPoint = endpoint;
            }
        }
    }

    return segments;
}
