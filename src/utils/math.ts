/**
 * Math Utilities - Core Mathematical Functions
 * 
 * Basic mathematical operations for points and vectors.
 * For more complex geometric operations, see geometry.ts
 */

import type { Point } from '../types';
import { projectPointOntoSegment } from './segmentProjection';

/**
 * Calculate Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance in screen pixels, accounting for zoom
 */
export function screenDistance(p1: Point, p2: Point, zoom: number): number {
    return distance(p1, p2) * zoom;
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(p1: Point, p2: Point): Point {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}

/**
 * Calculate a point on a cubic Bezier curve at parameter t.
 * This is the canonical implementation; evaluateCubicBezier in geometry.ts delegates here.
 */
export function bezierPoint(start: Point, cp1: Point, cp2: Point, end: Point, t: number): Point {
    const t1 = 1 - t;
    const t1_2 = t1 * t1;
    const t1_3 = t1_2 * t1;
    const t_2 = t * t;
    const t_3 = t_2 * t;
    
    return {
        x: t1_3 * start.x + 3 * t1_2 * t * cp1.x + 3 * t1 * t_2 * cp2.x + t_3 * end.x,
        y: t1_3 * start.y + 3 * t1_2 * t * cp1.y + 3 * t1 * t_2 * cp2.y + t_3 * end.y,
    };
}

/**
 * Find the closest point on a line segment to a given point.
 * 
 * @see closestPointOnLineSegment in geometry.ts for a version that returns more info
 */
export function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
    return projectPointOntoSegment(point, start, end).closestPoint;
}

/**
 * Find intersection point between two line segments (if any).
 * Returns null if lines don't intersect or are parallel.
 */
export function lineSegmentIntersection(
    p1: Point, p2: Point, // First line segment
    p3: Point, p4: Point  // Second line segment
): Point | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Lines are parallel (use small epsilon for floating point comparison)
    if (Math.abs(denom) < 1e-10) {
        return null;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Check if intersection is within both segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
        };
    }

    return null;
}
