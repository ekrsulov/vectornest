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
 * Check if a segment is a sharp corner (no handles or very small handles)
 * and if it's within brush distance of the stroke.
 */
function isSharpCorner(seg: paper.Segment): boolean {
    const handleInLen = seg.handleIn.length;
    const handleOutLen = seg.handleOut.length;
    // Sharp corner = no significant handles
    return handleInLen < 0.5 && handleOutLen < 0.5;
}

/**
 * Checks if a point is near the brush stroke.
 */
function isNearBrushStroke(
    pt: paper.Point,
    brushPoints: Point[],
    brushRadius: number
): boolean {
    const r2 = brushRadius * brushRadius;
    for (const bp of brushPoints) {
        const dx = pt.x - bp.x;
        const dy = pt.y - bp.y;
        if (dx * dx + dy * dy < r2) return true;
    }
    return false;
}

/**
 * Rounds sharp corners of path elements that are near the brush stroke.
 * Works by adding cubic bezier handles to segments that are currently
 * line junctions (sharp corners).
 */
export function roundCorners(
    elements: CanvasElement[],
    brushPoints: Point[],
    brushSize: number,
    roundRadius: number
): CanvasElement[] {
    ensurePaperSetup();

    if (brushPoints.length === 0) return [];

    const modifiedElements: CanvasElement[] = [];

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
            // Iterate backwards since we may insert new segments
            for (let i = path.segments.length - 1; i >= 0; i--) {
                const seg = path.segments[i];
                if (!seg) continue;

                if (
                    isSharpCorner(seg) &&
                    isNearBrushStroke(seg.point, brushPoints, brushSize)
                ) {
                    // Round this corner by adding handles
                    const prevSeg =
                        path.segments[
                            (i - 1 + path.segments.length) % path.segments.length
                        ];
                    const nextSeg =
                        path.segments[(i + 1) % path.segments.length];

                    if (!prevSeg || !nextSeg) continue;
                    if (prevSeg === seg || nextSeg === seg) continue;

                    // Calculate direction vectors
                    const toPrev = prevSeg.point.subtract(seg.point);
                    const toNext = nextSeg.point.subtract(seg.point);

                    const prevLen = toPrev.length;
                    const nextLen = toNext.length;

                    if (prevLen < 0.1 || nextLen < 0.1) continue;

                    // Limit the round radius to half the shortest adjacent edge
                    const maxR = Math.min(prevLen / 2, nextLen / 2);
                    const r = Math.min(roundRadius, maxR);

                    // Points along the edges where the rounding starts/ends
                    const startPt = seg.point.add(toPrev.normalize(r));
                    const endPt = seg.point.add(toNext.normalize(r));

                    // Add cubic bezier handles for a smooth arc
                    // 0.5523 is the kappa constant for circle approximation
                    const kappa = 0.5523;
                    const handleLen = r * kappa;
                    const startHandle = toPrev.normalize(-handleLen);
                    const endHandle = toNext.normalize(-handleLen);

                    // Replace the corner segment with two new segments forming an arc
                    path.removeSegment(i);
                    path.insert(
                        i,
                        new paper.Segment(endPt, endHandle, new paper.Point(0, 0))
                    );
                    path.insert(
                        i,
                        new paper.Segment(startPt, new paper.Point(0, 0), startHandle)
                    );

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
