import paper from 'paper';
import type { CanvasElement, PathData, Point } from '../../types';
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
 * Builds a closed contour path around a stroke path with the given radius.
 * Uses offset normals along the path with round caps at both ends.
 */
function buildStrokeContour(strokePath: paper.Path, radius: number): paper.Path {
    const contour = new paper.Path();

    // For very short strokes (single dot), return a circle
    if (strokePath.length < 1) {
        const center = strokePath.firstSegment?.point ?? new paper.Point(0, 0);
        const circle = new paper.Path.Circle({ center, radius });
        return circle;
    }

    const numSteps = Math.max(12, Math.ceil(strokePath.length / Math.max(1, radius / 3)));
    const stepLen = strokePath.length / numSteps;

    // Forward pass — right side of the stroke
    for (let i = 0; i <= numSteps; i++) {
        const offset = Math.min(i * stepLen, strokePath.length);
        const point = strokePath.getPointAt(offset);
        const normal = strokePath.getNormalAt(offset);
        if (point && normal) {
            contour.add(point.add(normal.multiply(radius)));
        }
    }

    // End cap — semicircle from +normal to -normal
    const endPoint = strokePath.getPointAt(strokePath.length);
    const endNormal = strokePath.getNormalAt(strokePath.length);
    if (endPoint && endNormal) {
        const startAngle = endNormal.angle;
        for (let a = 30; a <= 150; a += 30) {
            const offset = new paper.Point({ length: radius, angle: startAngle - a });
            contour.add(endPoint.add(offset));
        }
    }

    // Backward pass — left side of the stroke
    for (let i = numSteps; i >= 0; i--) {
        const offset = Math.min(i * stepLen, strokePath.length);
        const point = strokePath.getPointAt(offset);
        const normal = strokePath.getNormalAt(offset);
        if (point && normal) {
            contour.add(point.subtract(normal.multiply(radius)));
        }
    }

    // Start cap — semicircle from -normal to +normal
    const startPoint = strokePath.getPointAt(0);
    const startNormal = strokePath.getNormalAt(0);
    if (startPoint && startNormal) {
        const startAngle = startNormal.angle + 180;
        for (let a = 30; a <= 150; a += 30) {
            const offset = new paper.Point({ length: radius, angle: startAngle - a });
            contour.add(startPoint.add(offset));
        }
    }

    contour.closePath();
    contour.simplify(1);
    return contour;
}

/**
 * Erases portions of existing SVG paths using a freehand stroke.
 * Builds a contour shape around the eraser path, then subtracts it
 * from all intersecting target elements.
 * Handles element transforms by converting to/from canvas space for boolean ops.
 */
export function eraseElementsWithPath(
    elements: CanvasElement[],
    eraserPoints: Point[],
    eraserSize: number
): { elementsToAdd: CanvasElement[]; elementsToRemove: string[] } {
    ensurePaperSetup();

    const elementsToAdd: CanvasElement[] = [];
    const elementsToRemove: string[] = [];

    if (eraserPoints.length === 0) return { elementsToAdd, elementsToRemove };

    // 1. Create the eraser stroke path in paper.js (points are in canvas coordinates)
    const strokePath = new paper.Path();
    eraserPoints.forEach((p) => {
        strokePath.add(new paper.Point(p.x, p.y));
    });
    strokePath.simplify(0.5);

    // 2. Build the eraser shape using the contour approach
    const radius = eraserSize / 2;
    const eraserShape = buildStrokeContour(strokePath, radius);
    strokePath.remove();

    // 3. Subtract from targets
    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);

        // Apply element transform to bring into canvas space
        applyElementTransformToPaper(paperEl, data);

        // Check intersection bbox first to optimize
        if (!eraserShape.bounds.intersects(paperEl.bounds)) {
            paperEl.remove();
            continue;
        }

        try {
            const result = paperEl.subtract(eraserShape);

            if (result) {
                const originalArea = Math.abs(
                    paperEl instanceof paper.Path ? paperEl.area : 0
                );

                // Extract pieces (it might have been split into multiple)
                const pieces: paper.Path[] = [];
                if (result instanceof paper.CompoundPath) {
                    for (const c of result.children) {
                        if (c instanceof paper.Path && Math.abs(c.area) > 0.1) {
                            pieces.push(c);
                        }
                    }
                } else if (result instanceof paper.Path && Math.abs(result.area) > 0.1) {
                    pieces.push(result);
                }

                const resultArea = pieces.reduce((sum, p) => sum + Math.abs(p.area), 0);

                if (pieces.length > 0 && Math.abs(resultArea - originalArea) > 0.1) {
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
            }
        } catch {
            // Boolean operation failed — skip this element
        }
        paperEl.remove();
    }

    eraserShape.remove();

    return { elementsToAdd, elementsToRemove };
}
