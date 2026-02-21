import paper from 'paper';
import type { CanvasElement, PathData } from '../../types';
import { ensurePaperSetup } from '../../utils/pathOperations/paperSetup';
import { convertPathDataToPaperPath } from '../../utils/pathOperations/converters/toPaperPath';
import { convertPaperPathToPathData } from '../../utils/pathOperations/converters/fromPaperPath';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Apply an element's transform/transformMatrix to a Paper.js path item
 * so that it's in global canvas coordinate space.
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
 * Used to transform results back from canvas space to local element space.
 */
function getInverseElementMatrix(data: PathData): paper.Matrix | null {
    if (data.transformMatrix) {
        const [a, b, c, d, tx, ty] = data.transformMatrix;
        const m = new paper.Matrix(a, b, c, d, tx, ty);
        return m.inverted();
    }
    if (data.transform) {
        const t = data.transform;
        const hasTransform =
            t.translateX || t.translateY || t.rotation || t.scaleX !== 1 || t.scaleY !== 1;
        if (!hasTransform) return null;
        let m = new paper.Matrix();
        if (t.translateX || t.translateY) {
            m = m.translate(new paper.Point(t.translateX, t.translateY));
        }
        if (t.rotation) {
            m = m.rotate(t.rotation, new paper.Point(0, 0));
        }
        if (t.scaleX !== 1 || t.scaleY !== 1) {
            m = m.scale(t.scaleX, t.scaleY, new paper.Point(0, 0));
        }
        return m.inverted();
    }
    return null;
}

/**
 * Builds a thin closed polygon around a cut path to use as a boolean cutting shape.
 * Uses offset normals stepped along the path at regular intervals.
 */
function buildCuttingShape(cutPath: paper.Path, offset: number): paper.Path {
    const cuttingShape = new paper.Path();

    if (cutPath.length < 1) {
        cuttingShape.remove();
        return cuttingShape;
    }

    const numSteps = Math.max(8, Math.ceil(cutPath.length / 2));
    const stepLen = cutPath.length / numSteps;

    // Forward pass with positive offset
    for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(i * stepLen, cutPath.length);
        const point = cutPath.getPointAt(t);
        const normal = cutPath.getNormalAt(t);
        if (point && normal) {
            cuttingShape.add(point.add(normal.multiply(offset)));
        }
    }

    // Backward pass with negative offset
    for (let i = numSteps; i >= 0; i--) {
        const t = Math.min(i * stepLen, cutPath.length);
        const point = cutPath.getPointAt(t);
        const normal = cutPath.getNormalAt(t);
        if (point && normal) {
            cuttingShape.add(point.subtract(normal.multiply(offset)));
        }
    }

    cuttingShape.closed = true;
    return cuttingShape;
}

/**
 * Cuts path elements using a freehand cut path (in canvas coordinates).
 * Handles element transforms by converting to/from canvas space for boolean ops.
 */
export function cutElementsWithPath(
    elements: CanvasElement[],
    cutSvgPathString: string
): { elementsToAdd: CanvasElement[]; elementsToRemove: string[] } {
    ensurePaperSetup();

    const elementsToAdd: CanvasElement[] = [];
    const elementsToRemove: string[] = [];

    const cutPaperPath = new paper.Path(cutSvgPathString);
    if (cutPaperPath.length < 1) {
        cutPaperPath.remove();
        return { elementsToAdd, elementsToRemove };
    }
    cutPaperPath.simplify(0.5);

    const cuttingShape = buildCuttingShape(cutPaperPath, 0.5);
    if (cuttingShape.segments.length < 3) {
        cuttingShape.remove();
        cutPaperPath.remove();
        return { elementsToAdd, elementsToRemove };
    }

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);

        // Apply element transform to bring into canvas space
        applyElementTransformToPaper(paperEl, data);

        if (!cuttingShape.bounds.intersects(paperEl.bounds)) {
            paperEl.remove();
            continue;
        }

        try {
            const result = paperEl.subtract(cuttingShape);
            if (!result) {
                paperEl.remove();
                continue;
            }

            // Extract individual pieces
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

            // Check if the cut actually changed the shape
            const originalArea = Math.abs(
                paperEl instanceof paper.Path ? paperEl.area : 0
            );
            const resultArea = pieces.reduce((sum, p) => sum + Math.abs(p.area), 0);

            if (pieces.length > 0 && Math.abs(resultArea - originalArea) > 0.2) {
                elementsToRemove.push(el.id);

                // Get inverse matrix to transform results back into element's local space
                const inverseMat = getInverseElementMatrix(data);

                pieces.forEach((piece) => {
                    // Transform piece back to local coordinate space if needed
                    if (inverseMat) piece.transform(inverseMat);

                    const pieceData = convertPaperPathToPathData(piece);
                    if (pieceData.subPaths.length > 0) {
                        const newEl: CanvasElement = {
                            ...el,
                            id: uuidv4(),
                            data: {
                                ...(el.data as PathData),
                                subPaths: pieceData.subPaths,
                            },
                        };
                        elementsToAdd.push(newEl);
                    }
                });
            }
            result.remove();
        } catch {
            // Boolean operation failed — skip this element
        }
        paperEl.remove();
    }

    cuttingShape.remove();
    cutPaperPath.remove();
    return { elementsToAdd, elementsToRemove };
}
