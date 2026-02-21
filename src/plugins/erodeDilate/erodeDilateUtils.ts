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
 * Get the inverse Paper.js matrix for an element's transform.
 */
function getInverseElementMatrix(data: PathData): paper.Matrix | null {
    if (data.transformMatrix) {
        const [a, b, c, d, tx, ty] = data.transformMatrix;
        const m = new paper.Matrix(a, b, c, d, tx, ty);
        return m.inverted();
    }
    if (data.transform) {
        const t = data.transform;
        const hasTransform = t.translateX || t.translateY || t.rotation || t.scaleX !== 1 || t.scaleY !== 1;
        if (!hasTransform) return null;
        let m = new paper.Matrix();
        if (t.translateX || t.translateY) m = m.translate(new paper.Point(t.translateX, t.translateY));
        if (t.rotation) m = m.rotate(t.rotation, new paper.Point(0, 0));
        if (t.scaleX !== 1 || t.scaleY !== 1) m = m.scale(t.scaleX, t.scaleY, new paper.Point(0, 0));
        return m.inverted();
    }
    return null;
}

/**
 * Checks if a point is near the brush stroke.
 */
function isNearBrushStroke(
    point: paper.Point,
    brushPoints: Point[],
    radius: number
): boolean {
    const r2 = radius * radius;
    for (const bp of brushPoints) {
        const dx = point.x - bp.x;
        const dy = point.y - bp.y;
        if (dx * dx + dy * dy < r2) return true;
    }
    return false;
}

/**
 * Erodes (shrinks) or dilates (expands) path segments that fall within the brush area.
 * Erode moves vertices inward toward the path centroid.
 * Dilate moves vertices outward away from the path centroid.
 */
export function erodeOrDilateElements(
    elements: CanvasElement[],
    brushPoints: Point[],
    brushRadius: number,
    amount: number,
    mode: 'erode' | 'dilate'
): CanvasElement[] {
    ensurePaperSetup();

    if (brushPoints.length === 0) return [];

    const modifiedElements: CanvasElement[] = [];
    const direction = mode === 'dilate' ? 1 : -1;

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);
        applyElementTransformToPaper(paperEl, data);

        const paths: paper.Path[] = [];
        if (paperEl instanceof paper.CompoundPath) {
            for (const child of paperEl.children) {
                if (child instanceof paper.Path) paths.push(child);
            }
        } else if (paperEl instanceof paper.Path) {
            paths.push(paperEl);
        }

        let modified = false;

        for (const path of paths) {
            // Compute the centroid of segments in the brush area for direction reference
            let cx = 0, cy = 0, count = 0;
            for (const seg of path.segments) {
                if (isNearBrushStroke(seg.point, brushPoints, brushRadius)) {
                    cx += seg.point.x;
                    cy += seg.point.y;
                    count++;
                }
            }
            if (count === 0) continue;
            cx /= count;
            cy /= count;
            const centroid = new paper.Point(cx, cy);

            for (const seg of path.segments) {
                if (isNearBrushStroke(seg.point, brushPoints, brushRadius)) {
                    // Move point along the normal direction (away from or toward centroid)
                    const toPoint = seg.point.subtract(centroid);
                    const dist = toPoint.length;
                    if (dist > 0.01) {
                        const normal = toPoint.normalize();
                        seg.point = seg.point.add(normal.multiply(amount * direction));

                        // Adjust handles proportionally
                        if (seg.handleIn.length > 0) {
                            seg.handleIn = seg.handleIn.multiply(
                                mode === 'dilate' ? 1.05 : 0.95
                            );
                        }
                        if (seg.handleOut.length > 0) {
                            seg.handleOut = seg.handleOut.multiply(
                                mode === 'dilate' ? 1.05 : 0.95
                            );
                        }
                    }
                    modified = true;
                }
            }
        }

        if (modified) {
            const inverseMat = getInverseElementMatrix(data);
            if (inverseMat) paperEl.transform(inverseMat);

            const resultData = convertPaperPathToPathData(
                paperEl as paper.Path | paper.CompoundPath
            );

            if (resultData.subPaths.length > 0) {
                modifiedElements.push({
                    ...el,
                    data: {
                        ...(el.data as PathData),
                        subPaths: resultData.subPaths,
                    },
                });
            }
        }

        paperEl.remove();
    }

    return modifiedElements;
}
