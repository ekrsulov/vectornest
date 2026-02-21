import paper from 'paper';
import type { CanvasElement, PathData, Point } from '../../types';
import { ensurePaperSetup } from '../../utils/pathOperations/paperSetup';
import { convertPathDataToPaperPath } from '../../utils/pathOperations/converters/toPaperPath';
import { convertPaperPathToPathData } from '../../utils/pathOperations/converters/fromPaperPath';

/**
 * Apply an element's transform/transformMatrix to a Paper.js path item.
 */
function applyElementTransformToPaper(paperPath: paper.PathItem, data: PathData): void {
    if (data.transformMatrix) {
        const [a, b, c, d, tx, ty] = data.transformMatrix;
        paperPath.transform(new paper.Matrix(a, b, c, d, tx, ty));
    } else if (data.transform) {
        const t = data.transform;
        if (t.translateX || t.translateY) {
            paperPath.translate(new paper.Point(t.translateX, t.translateY));
        }
        if (t.rotation) {
            paperPath.rotate(t.rotation);
        }
        if (t.scaleX !== 1 || t.scaleY !== 1) {
            paperPath.scale(t.scaleX, t.scaleY);
        }
    }
}

/**
 * Get the inverse matrix for an element so we can transform back after operation.
 */
function getInverseElementMatrix(data: PathData): paper.Matrix {
    const mat = new paper.Matrix();
    if (data.transformMatrix) {
        const [a, b, c, d, tx, ty] = data.transformMatrix;
        mat.set(a, b, c, d, tx, ty);
    } else if (data.transform) {
        const t = data.transform;
        if (t.translateX || t.translateY) {
            mat.translate(new paper.Point(t.translateX, t.translateY));
        }
        if (t.rotation) {
            mat.rotate(t.rotation, new paper.Point(0, 0));
        }
        if (t.scaleX !== 1 || t.scaleY !== 1) {
            mat.scale(t.scaleX, t.scaleY);
        }
    }
    return mat.inverted();
}

/**
 * Smooth elements within the brush stroke path.
 *
 * For each path element that has segments near the brush stroke,
 * we apply smoothing to the nearby segments using Paper.js path.smooth().
 */
export function smoothElements(
    elements: CanvasElement[],
    strokePoints: Point[],
    brushRadius: number,
    strength: number,
    preserveShape: boolean
): CanvasElement[] {
    ensurePaperSetup();

    const result: CanvasElement[] = [];
    const radiusSq = brushRadius * brushRadius;

    for (const el of elements) {
        if (el.type !== 'path') continue;
        const data = el.data as PathData;
        if (!data.subPaths || data.subPaths.length === 0) continue;

        const paperPath = convertPathDataToPaperPath(data);
        if (!paperPath) continue;

        applyElementTransformToPaper(paperPath, data);

        let didModify = false;

        if (paperPath instanceof paper.CompoundPath) {
            for (const child of paperPath.children as paper.Path[]) {
                if (smoothPathSegments(child, strokePoints, radiusSq, strength, preserveShape)) {
                    didModify = true;
                }
            }
        } else if (paperPath instanceof paper.Path) {
            if (smoothPathSegments(paperPath, strokePoints, radiusSq, strength, preserveShape)) {
                didModify = true;
            }
        }

        if (didModify) {
            const inverseMat = getInverseElementMatrix(data);
            paperPath.transform(inverseMat);

            const newPathData = convertPaperPathToPathData(paperPath as paper.Path | paper.CompoundPath);
            if (newPathData && newPathData.subPaths.length > 0) {
                result.push({
                    ...el,
                    data: {
                        ...data,
                        subPaths: newPathData.subPaths,
                    },
                });
            }
        }

        paperPath.remove();
    }

    return result;
}

/**
 * Smooth segments of a single Paper.js Path that fall within the brush stroke.
 * Returns true if any modifications were made.
 */
function smoothPathSegments(
    path: paper.Path,
    strokePoints: Point[],
    radiusSq: number,
    strength: number,
    preserveShape: boolean
): boolean {
    if (path.segments.length < 2) return false;

    // Find which segments are near the brush stroke
    const nearbyIndices: number[] = [];

    for (let i = 0; i < path.segments.length; i++) {
        const seg = path.segments[i];
        const sx = seg.point.x;
        const sy = seg.point.y;

        for (const sp of strokePoints) {
            const dx = sx - sp.x;
            const dy = sy - sp.y;
            if (dx * dx + dy * dy <= radiusSq) {
                nearbyIndices.push(i);
                break;
            }
        }
    }

    if (nearbyIndices.length === 0) return false;

    // Strength maps to smoothing factor
    // Low strength = gentle (keep more of original), high = aggressive (full smooth)
    const factor = strength / 10; // 0.1 to 1.0

    if (preserveShape) {
        // Smooth only the nearby segments by lerping handles toward smooth values
        // We create a clone, smooth it, and lerp handles from original to smoothed
        const clone = path.clone() as paper.Path;
        try {
            // Use Paper.js smooth on the full clone with 'continuous' type
            clone.smooth({ type: 'continuous' });

            for (const idx of nearbyIndices) {
                const origSeg = path.segments[idx];
                const smoothSeg = clone.segments[idx];
                if (!origSeg || !smoothSeg) continue;

                // Lerp handle in
                origSeg.handleIn = new paper.Point(
                    origSeg.handleIn.x + (smoothSeg.handleIn.x - origSeg.handleIn.x) * factor,
                    origSeg.handleIn.y + (smoothSeg.handleIn.y - origSeg.handleIn.y) * factor
                );

                // Lerp handle out
                origSeg.handleOut = new paper.Point(
                    origSeg.handleOut.x +
                        (smoothSeg.handleOut.x - origSeg.handleOut.x) * factor,
                    origSeg.handleOut.y +
                        (smoothSeg.handleOut.y - origSeg.handleOut.y) * factor
                );
            }
        } finally {
            clone.remove();
        }
    } else {
        // Aggressive: smooth nearby segment regions directly and also lerp anchor positions
        const clone = path.clone() as paper.Path;
        try {
            clone.smooth({ type: 'continuous' });

            for (const idx of nearbyIndices) {
                const origSeg = path.segments[idx];
                const smoothSeg = clone.segments[idx];
                if (!origSeg || !smoothSeg) continue;

                // Lerp point position
                origSeg.point = new paper.Point(
                    origSeg.point.x + (smoothSeg.point.x - origSeg.point.x) * factor * 0.3,
                    origSeg.point.y + (smoothSeg.point.y - origSeg.point.y) * factor * 0.3
                );

                // Lerp handles more aggressively
                origSeg.handleIn = new paper.Point(
                    origSeg.handleIn.x + (smoothSeg.handleIn.x - origSeg.handleIn.x) * factor,
                    origSeg.handleIn.y + (smoothSeg.handleIn.y - origSeg.handleIn.y) * factor
                );

                origSeg.handleOut = new paper.Point(
                    origSeg.handleOut.x +
                        (smoothSeg.handleOut.x - origSeg.handleOut.x) * factor,
                    origSeg.handleOut.y +
                        (smoothSeg.handleOut.y - origSeg.handleOut.y) * factor
                );
            }
        } finally {
            clone.remove();
        }
    }

    return true;
}
