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
 * Checks if a Paper.js point is within `radius` of any point in the brush stroke.
 */
function isNearBrushStroke(
    segmentPoint: paper.Point,
    brushPoints: Point[],
    radius: number
): boolean {
    const r2 = radius * radius;
    for (const bp of brushPoints) {
        const dx = segmentPoint.x - bp.x;
        const dy = segmentPoint.y - bp.y;
        if (dx * dx + dy * dy < r2) return true;
    }
    return false;
}

/**
 * Roughens path elements by adding random displacement to segments
 * that fall within the brush stroke area. Also subdivides long segments
 * for finer roughening.
 */
export function roughenElements(
    elements: CanvasElement[],
    brushPoints: Point[],
    roughenRadius: number,
    intensity: number,
    detail: number
): CanvasElement[] {
    ensurePaperSetup();

    if (brushPoints.length === 0) return [];

    const modifiedElements: CanvasElement[] = [];

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);
        applyElementTransformToPaper(paperEl, data);

        // Get all paths from the item
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
            // Subdivide segments that are near the brush stroke for finer detail
            for (let subdivide = 0; subdivide < detail; subdivide++) {
                for (let i = path.segments.length - 1; i >= 1; i--) {
                    const seg = path.segments[i];
                    const prevSeg = path.segments[i - 1];
                    if (!seg || !prevSeg) continue;

                    const midX = (seg.point.x + prevSeg.point.x) / 2;
                    const midY = (seg.point.y + prevSeg.point.y) / 2;
                    const midPt = new paper.Point(midX, midY);

                    const segDist = seg.point.getDistance(prevSeg.point);
                    if (
                        segDist > intensity * 2 &&
                        isNearBrushStroke(midPt, brushPoints, roughenRadius)
                    ) {
                        path.insert(i, new paper.Segment(midPt));
                    }
                }
            }

            // Displace segments near the brush stroke
            for (const seg of path.segments) {
                if (isNearBrushStroke(seg.point, brushPoints, roughenRadius)) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = (Math.random() - 0.5) * 2 * intensity;
                    seg.point = seg.point.add(
                        new paper.Point(Math.cos(angle) * dist, Math.sin(angle) * dist)
                    );

                    // Also slightly randomize handles for organic look
                    if (seg.handleIn.length > 0) {
                        seg.handleIn = seg.handleIn.add(
                            new paper.Point(
                                (Math.random() - 0.5) * intensity * 0.5,
                                (Math.random() - 0.5) * intensity * 0.5
                            )
                        );
                    }
                    if (seg.handleOut.length > 0) {
                        seg.handleOut = seg.handleOut.add(
                            new paper.Point(
                                (Math.random() - 0.5) * intensity * 0.5,
                                (Math.random() - 0.5) * intensity * 0.5
                            )
                        );
                    }
                    modified = true;
                }
            }
        }

        if (modified) {
            // Transform back to local space
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
