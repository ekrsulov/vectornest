import type { Point } from '../types';
import { bezierPoint } from './math';
import { projectPointOntoSegment } from './segmentProjection';
import {
  BEZIER_CLOSEST_POINT_SAMPLES,
  BEZIER_NEWTON_EPSILON,
  BEZIER_NEWTON_ITERATIONS,
} from '../constants';

/** Pre-computed direction angles for cardinal + diagonal snapping (8 directions, 45° increments). */
const CARDINAL_AND_DIAGONAL_DIRS = [
  0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4,
  Math.PI, -(3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4,
] as const;

/**
 * Calculate squared distance between two points.
 * Avoids the cost of Math.sqrt when only comparison is needed.
 */
export const distanceSquared = (a: Point, b: Point): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

/**
 * Normalize angle between -PI and PI using modular arithmetic.
 */
export function normalizeAngle(angle: number): number {
    const TWO_PI = 2 * Math.PI;
    const a = ((angle + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    return a;
}

/**
 * Constrain a point relative to a start point to the closest of 8 directions
 * (horizontal, vertical, or diagonal 45deg steps) while preserving distance.
 */
export function constrainToCardinalAndDiagonal(start: Point, point: Point): Point {
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return point;

    // Candidate directions in radians (hoisted to module-level constant)
    const dirs = CARDINAL_AND_DIAGONAL_DIRS;
    const angle = Math.atan2(dy, dx);
    let best: number = dirs[0];
    let bestDiff = Math.abs(normalizeAngle(angle - dirs[0]));

    for (let i = 1; i < dirs.length; i++) {
        const d = dirs[i];
        const diff = Math.abs(normalizeAngle(angle - d));
        if (diff < bestDiff) {
            bestDiff = diff;
            best = d;
        }
    }

    return {
        x: start.x + Math.cos(best) * length,
        y: start.y + Math.sin(best) * length,
    };
}

/**
 * Calculate the closest point on a line segment to a given point
 */
export function closestPointOnLineSegment(
    point: Point,
    start: Point,
    end: Point
): { closestPoint: Point; t: number; distance: number } {
    const projection = projectPointOntoSegment(point, start, end);
    return {
        closestPoint: projection.closestPoint,
        t: projection.t,
        distance: Math.sqrt(projection.distanceSquared),
    };
}

/**
 * Calculate the closest point on a cubic bezier curve to a given point
 * Uses iterative approximation
 */
export function closestPointOnCubicBezier(
    point: Point,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    samples: number = BEZIER_CLOSEST_POINT_SAMPLES
): { closestPoint: Point; t: number; distance: number } {
    const sampleCount = Math.max(1, Math.floor(samples));
    const sampleStep = 1 / sampleCount;

    let minDistanceSquared = Infinity;
    let bestT = 0;
    let bestPoint = p0;

    // Sample the curve at regular intervals
    for (let i = 0; i <= sampleCount; i++) {
        const t = i * sampleStep;
        const curvePoint = evaluateCubicBezier(t, p0, p1, p2, p3);
        const dSquared = distanceSquared(point, curvePoint);

        if (dSquared < minDistanceSquared) {
            minDistanceSquared = dSquared;
            bestT = t;
            bestPoint = curvePoint;
            if (dSquared === 0) {
                break;
            }
        }
    }

    // Refine the result using a few iterations of Newton's method
    const iterations = BEZIER_NEWTON_ITERATIONS;
    let t = bestT;
    for (let i = 0; i < iterations; i++) {
        const curvePoint = evaluateCubicBezier(t, p0, p1, p2, p3);
        const derivative = evaluateCubicBezierDerivative(t, p0, p1, p2, p3);

        const dx = curvePoint.x - point.x;
        const dy = curvePoint.y - point.y;

        const numerator = dx * derivative.x + dy * derivative.y;
        const denominator = derivative.x * derivative.x + derivative.y * derivative.y;

        if (Math.abs(denominator) < BEZIER_NEWTON_EPSILON) break;

        const dt = -numerator / denominator;
        t = Math.max(0, Math.min(1, t + dt));

        if (Math.abs(dt) < BEZIER_NEWTON_EPSILON) break;
    }

    bestPoint = evaluateCubicBezier(t, p0, p1, p2, p3);
    minDistanceSquared = distanceSquared(point, bestPoint);

    return { closestPoint: bestPoint, t, distance: Math.sqrt(minDistanceSquared) };
}

/**
 * Evaluate a cubic bezier curve at parameter t.
 * Delegates to the canonical implementation in math.ts.
 */
export function evaluateCubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    return bezierPoint(p0, p1, p2, p3, t);
}

/**
 * Evaluate the derivative of a cubic bezier curve at parameter t
 */
export function evaluateCubicBezierDerivative(
    t: number,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point
): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;

    return {
        x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
        y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
    };
}
