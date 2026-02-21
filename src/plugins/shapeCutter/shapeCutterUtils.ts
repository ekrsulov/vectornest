import paper from 'paper';
import type { CanvasElement, PathData } from '../../types';
import { ensurePaperSetup } from '../../utils/pathOperations/paperSetup';
import { convertPathDataToPaperPath } from '../../utils/pathOperations/converters/toPaperPath';
import { convertPaperPathToPathData } from '../../utils/pathOperations/converters/fromPaperPath';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

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
 * Uses a freehand-drawn closed region to cut (subtract) or keep (intersect)
 * portions of all intersecting path elements.
 *
 * - `subtract` mode: Removes the drawn region from each element
 * - `intersect` mode: Keeps only the part inside the drawn region
 */
export function cutWithShape(
    elements: CanvasElement[],
    cutterSvgPathString: string,
    mode: 'subtract' | 'intersect'
): { elementsToAdd: CanvasElement[]; elementsToRemove: string[] } {
    ensurePaperSetup();

    const elementsToAdd: CanvasElement[] = [];
    const elementsToRemove: string[] = [];

    // Create closed cutting shape
    const cutterPath = new paper.Path(cutterSvgPathString);
    cutterPath.closePath();
    cutterPath.simplify(1);

    if (cutterPath.segments.length < 3 || Math.abs(cutterPath.area) < 1) {
        cutterPath.remove();
        return { elementsToAdd, elementsToRemove };
    }

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);
        applyElementTransformToPaper(paperEl, data);

        if (!cutterPath.bounds.intersects(paperEl.bounds)) {
            paperEl.remove();
            continue;
        }

        try {
            const result =
                mode === 'subtract'
                    ? paperEl.subtract(cutterPath)
                    : paperEl.intersect(cutterPath);

            if (!result) {
                paperEl.remove();
                continue;
            }

            // Extract pieces
            const pieces: paper.Path[] = [];
            if (result instanceof paper.CompoundPath) {
                for (const child of result.children) {
                    if (child instanceof paper.Path && Math.abs(child.area) > 0.1) {
                        pieces.push(child);
                    }
                }
            } else if (result instanceof paper.Path && Math.abs(result.area) > 0.1) {
                pieces.push(result);
            }

            const originalArea = Math.abs(paperEl instanceof paper.Path ? paperEl.area : 0);
            const resultArea = pieces.reduce((sum, p) => sum + Math.abs(p.area), 0);

            if (pieces.length > 0 && Math.abs(resultArea - originalArea) > 0.2) {
                elementsToRemove.push(el.id);
                const inverseMat = getInverseElementMatrix(data);

                pieces.forEach((piece) => {
                    if (inverseMat) piece.transform(inverseMat);

                    const pieceData = convertPaperPathToPathData(piece);
                    if (pieceData.subPaths.length > 0) {
                        elementsToAdd.push({
                            ...el,
                            id: uuidv4(),
                            data: {
                                ...(el.data as PathData),
                                subPaths: pieceData.subPaths,
                            },
                        });
                    }
                });
            }
            result.remove();
        } catch {
            // Boolean operation failed — skip
        }
        paperEl.remove();
    }

    cutterPath.remove();
    return { elementsToAdd, elementsToRemove };
}
