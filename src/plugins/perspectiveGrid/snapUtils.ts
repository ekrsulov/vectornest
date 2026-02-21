import type { Point } from '../../types';
import type { PerspectiveGridState } from './slice';

/**
 * Calculates a snap point along the nearest perspective ray
 */
export function getPerspectiveSnapPoint(
    currentPoint: Point,
    state: PerspectiveGridState,
    tolerance: number
): { point: Point; priority: number } | null {
    if (!state.enabled || !state.snapEnabled) return null;

    const { mode, vp1, vp2, vp3, horizonY, gridDensity } = state;

    let bestSnap: Point | null = null;
    let minDistance = tolerance;

    // Helper to check rays from a specific vanishing point
    const checkRays = (vpX: number, vpY: number) => {
        // Determine angle to the current point
        const dx = currentPoint.x - vpX;
        const dy = currentPoint.y - vpY;
        const angle = Math.atan2(dy, dx);

        // Find the nearest ray angle based on grid density
        const step = Math.PI / gridDensity;
        const snappedAngle = Math.round(angle / step) * step;

        // Project the current point onto that snapped ray
        const rayDist = Math.sqrt(dx * dx + dy * dy);
        const projX = vpX + Math.cos(snappedAngle) * rayDist;
        const projY = vpY + Math.sin(snappedAngle) * rayDist;

        // Distance from current point to the projected point on the ray
        const distToRay = Math.sqrt(Math.pow(currentPoint.x - projX, 2) + Math.pow(currentPoint.y - projY, 2));

        if (distToRay < minDistance) {
            minDistance = distToRay;
            bestSnap = { x: projX, y: projY };
        }
    };

    // Check horizon if in 1 or 2 point mode
    if (mode !== '3-point') {
        const distToHorizon = Math.abs(currentPoint.y - horizonY);
        if (distToHorizon < minDistance) {
            minDistance = distToHorizon;
            bestSnap = { x: currentPoint.x, y: horizonY };
        }
    }

    // Check rays depending on mode
    if (mode === '1-point') {
        checkRays(vp1.x, vp1.y);
    } else if (mode === '2-point') {
        checkRays(vp1.x, horizonY);
        checkRays(vp2.x, horizonY);
    } else if (mode === '3-point') {
        checkRays(vp1.x, vp1.y);
        checkRays(vp2.x, vp2.y);
        checkRays(vp3.x, vp3.y);
    }

    if (bestSnap) {
        return { point: bestSnap, priority: 60 }; // Medium-high priority for grids
    }

    return null;
}
