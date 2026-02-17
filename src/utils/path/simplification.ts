import { pointToLineDistance } from './geometry';

/**
 * Simplify points using the Ramer-Douglas-Peucker algorithm
 * This is the standard algorithm for curve simplification
 */
export function simplifyPoints(points: Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>, tolerance: number = 1.0, minDistance: number = 0.1): Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }> {

    if (points.length <= 2) {
        return points;
    }

    // First pass: remove points that are too close to their neighbors
    const filteredPoints: typeof points = [];
    filteredPoints.push(points[0]); // Always keep the first point

    for (let i = 1; i < points.length; i++) {
        const prevPoint = filteredPoints[filteredPoints.length - 1];
        const currentPoint = points[i];

        // Skip control points for distance check
        if (currentPoint.isControl) {
            filteredPoints.push(currentPoint);
            continue;
        }

        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only keep points that are far enough from the previous retained point
        if (distance >= minDistance) {
            filteredPoints.push(currentPoint);
        }
    }

    // Don't automatically add the last point - it's already processed in the loop above

    // If we filtered out too many points, return the filtered result
    if (filteredPoints.length <= 2) {
        return filteredPoints;
    }

    // Second pass: apply RDP algorithm
    const rdpResult = simplifyPointsRDP(filteredPoints, tolerance);

    return rdpResult;
}

/**
 * Internal RDP simplification function
 */
function simplifyPointsRDP(points: Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>, tolerance: number): Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }> {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line between start and end
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const point = points[i];

        // Skip control points for simplification
        if (point.isControl) continue;

        const distance = pointToLineDistance(point.x, point.y, start.x, start.y, end.x, end.y);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }

    // If max distance is greater than tolerance, recursively simplify both segments
    if (maxDistance > tolerance) {
        // Split into two segments and simplify recursively
        const leftSegment = simplifyPointsRDP(points.slice(0, maxIndex + 1), tolerance);
        const rightSegment = simplifyPointsRDP(points.slice(maxIndex), tolerance);

        // Combine results (remove duplicate point at junction)
        const result = [...leftSegment.slice(0, -1), ...rightSegment];
        return result;
    } else {
        // All intermediate points are within tolerance, keep only start and end
        return [start, end];
    }
}
