import type { Point } from '../../types';
import { PATH_DECIMAL_PRECISION } from '../../types';
import { formatToPrecision } from '../numberUtils';

/**
 * Calculate the distance from a point to a line segment
 */
export function pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        // Line segment is a point
        return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Adjust control point position to match the specified alignment type
 */
export function adjustControlPointForAlignment(
    controlPoint: Point,
    pairedPoint: Point,
    anchor: Point,
    newAlignmentType: 'independent' | 'aligned' | 'mirrored'
): Point {
    // Calculate current vector from anchor to control point
    const currentVector = {
        x: controlPoint.x - anchor.x,
        y: controlPoint.y - anchor.y
    };
    const currentMagnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);

    // Calculate vector from anchor to paired point
    const pairedVector = {
        x: pairedPoint.x - anchor.x,
        y: pairedPoint.y - anchor.y
    };
    const pairedMagnitude = Math.sqrt(pairedVector.x * pairedVector.x + pairedVector.y * pairedVector.y);

    if (newAlignmentType === 'independent') {
        // For independent, move the point slightly to break alignment if it's currently aligned
        if (currentMagnitude === 0) {
            // If point is at anchor, move it to a default position
            return {
                x: formatToPrecision(anchor.x + 20, PATH_DECIMAL_PRECISION),
                y: formatToPrecision(anchor.y, PATH_DECIMAL_PRECISION)
            };
        }

        // Check if currently aligned with paired point
        if (pairedMagnitude > 0) {
            const currentUnit = {
                x: currentVector.x / currentMagnitude,
                y: currentVector.y / currentMagnitude
            };
            const pairedUnit = {
                x: pairedVector.x / pairedMagnitude,
                y: pairedVector.y / pairedMagnitude
            };

            // Check if vectors are aligned (opposite directions)
            const dotProduct = currentUnit.x * (-pairedUnit.x) + currentUnit.y * (-pairedUnit.y);

            if (dotProduct > 0.985) { // Currently aligned
                // Move point perpendicular to break alignment
                const perpendicular = {
                    x: -currentUnit.y,
                    y: currentUnit.x
                };

                const offsetDistance = Math.max(10, currentMagnitude * 0.2); // 20% offset or minimum 10px

                return {
                    x: formatToPrecision(controlPoint.x + perpendicular.x * offsetDistance, PATH_DECIMAL_PRECISION),
                    y: formatToPrecision(controlPoint.y + perpendicular.y * offsetDistance, PATH_DECIMAL_PRECISION)
                };
            }
        }

        // If not aligned, keep current position
        return { x: controlPoint.x, y: controlPoint.y };
    }

    if (pairedMagnitude === 0) {
        // If paired point is at anchor, place control point at default position
        const defaultDistance = currentMagnitude > 0 ? currentMagnitude : 30;
        return {
            x: formatToPrecision(anchor.x + defaultDistance, PATH_DECIMAL_PRECISION),
            y: formatToPrecision(anchor.y, PATH_DECIMAL_PRECISION)
        };
    }

    // Calculate unit vector of paired point
    const pairedUnitVector = {
        x: pairedVector.x / pairedMagnitude,
        y: pairedVector.y / pairedMagnitude
    };

    // Calculate opposite direction
    const oppositeVector = {
        x: -pairedUnitVector.x,
        y: -pairedUnitVector.y
    };

    let newMagnitude: number;

    if (newAlignmentType === 'mirrored') {
        // For mirrored, use the same magnitude as the paired point
        newMagnitude = pairedMagnitude;
    } else if (newAlignmentType === 'aligned') {
        // For aligned, we need to determine a good magnitude
        // Always use a different magnitude than the paired point to make it visually distinct from mirrored

        // Use 70% of the paired point's magnitude to ensure visual distinction
        newMagnitude = pairedMagnitude * 0.7;

        // Ensure we have a reasonable minimum magnitude
        if (newMagnitude < 15) {
            newMagnitude = Math.max(pairedMagnitude * 0.5, 15); // Use 50% of paired magnitude or minimum 15px
        }

        // Ensure it's different enough to be visually distinct
        if (Math.abs(newMagnitude - pairedMagnitude) < 5) {
            newMagnitude = pairedMagnitude * 0.6; // Force more difference
        }
    } else {
        return { x: controlPoint.x, y: controlPoint.y };
    }

    return {
        x: formatToPrecision(anchor.x + oppositeVector.x * newMagnitude, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(anchor.y + oppositeVector.y * newMagnitude, PATH_DECIMAL_PRECISION)
    };
}
