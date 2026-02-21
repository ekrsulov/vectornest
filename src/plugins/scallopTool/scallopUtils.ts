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
 * Adds scallop (wavy/bump) distortions to path segments near the brush stroke.
 * Subdivides segments and displaces midpoints perpendicular to create bumps.
 */
export function scallopElements(
    elements: CanvasElement[],
    brushPoints: Point[],
    brushRadius: number,
    scallopSize: number,
    complexity: number
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
            // Subdivide segments near the brush stroke to create scallop detail
            for (let pass = 0; pass < complexity; pass++) {
                for (let i = path.segments.length - 1; i >= 1; i--) {
                    const seg = path.segments[i];
                    const prevSeg = path.segments[i - 1];
                    if (!seg || !prevSeg) continue;

                    const midX = (seg.point.x + prevSeg.point.x) / 2;
                    const midY = (seg.point.y + prevSeg.point.y) / 2;
                    const midPt = new paper.Point(midX, midY);

                    if (!isNearBrushStroke(midPt, brushPoints, brushRadius)) continue;

                    const segDist = seg.point.getDistance(prevSeg.point);
                    if (segDist < scallopSize * 0.5) continue;

                    // Compute perpendicular offset (scallop bump)
                    const dx = seg.point.x - prevSeg.point.x;
                    const dy = seg.point.y - prevSeg.point.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 0.01) continue;

                    // Normal direction (perpendicular to segment)
                    const nx = -dy / len;
                    const ny = dx / len;

                    // Alternate bump direction based on segment index
                    const direction = i % 2 === 0 ? 1 : -1;
                    const bumpPoint = new paper.Point(
                        midX + nx * scallopSize * direction,
                        midY + ny * scallopSize * direction
                    );

                    const newSeg = new paper.Segment(bumpPoint);
                    // Add smooth handles for rounded scallops
                    const handleLen = segDist * 0.25;
                    const tangent = new paper.Point(dx / len, dy / len);
                    newSeg.handleIn = tangent.multiply(-handleLen);
                    newSeg.handleOut = tangent.multiply(handleLen);

                    path.insert(i, newSeg);
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
