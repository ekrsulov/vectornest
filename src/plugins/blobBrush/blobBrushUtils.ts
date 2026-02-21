import paper from 'paper';
import type { CanvasElement, PathData, Point } from '../../types';
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
 * Converts a series of points (a brush stroke) into a solid, filled SVG path element.
 * Uses a stroke contour approach for performance.
 * If there are existing elements with the exact same fill color, it will union them.
 */
export function createBlobBrushShape(
    points: Point[],
    brushSize: number,
    fillColor: string,
    existingElements: CanvasElement[]
): { newElement: CanvasElement | null; elementsToRemove: string[] } {
    ensurePaperSetup();

    if (points.length === 0) {
        return { newElement: null, elementsToRemove: [] };
    }

    // 1. Create the stroke path in paper.js (points are already in canvas coordinates)
    const strokePath = new paper.Path();
    points.forEach((p) => {
        strokePath.add(new paper.Point(p.x, p.y));
    });
    strokePath.simplify(0.5);

    // 2. Build the filled outline using the contour approach
    const radius = brushSize / 2;
    let blobShape: paper.PathItem = buildStrokeContour(strokePath, radius);
    strokePath.remove();

    // 3. Union with existing elements that have the SAME fill color
    const elementsToRemove: string[] = [];

    for (const el of existingElements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        // Only merge with paths of the exact same fill color, with no stroke
        if (data.fillColor === fillColor && (!data.strokeColor || data.strokeColor === 'none')) {
            const paperEl = convertPathDataToPaperPath(data);

            // Apply element transform so coordinates are in canvas space
            applyElementTransformToPaper(paperEl, data);

            if (blobShape.bounds.intersects(paperEl.bounds)) {
                try {
                    const unionResult = blobShape.unite(paperEl);
                    if (unionResult && (unionResult instanceof paper.Path || unionResult instanceof paper.CompoundPath)) {
                        blobShape.remove();
                        blobShape = unionResult;
                        elementsToRemove.push(el.id);
                    }
                } catch {
                    // Boolean operation failed — skip merge for this element
                }
            }
            paperEl.remove();
        }
    }

    // 4. Convert back to CanvasElement using proper converter (handles compound paths)
    const resultData = convertPaperPathToPathData(blobShape as paper.Path | paper.CompoundPath);
    blobShape.remove();

    if (!resultData.subPaths || resultData.subPaths.length === 0) {
        return { newElement: null, elementsToRemove };
    }

    const maxZIndex = existingElements.reduce((max, element) => Math.max(max, element.zIndex ?? 0), -1);
    const newElementData: PathData = {
        subPaths: resultData.subPaths,
        fillColor,
        fillOpacity: 1,
        strokeColor: 'none',
        strokeOpacity: 1,
        strokeWidth: 0,
        fillRule: 'nonzero',
        opacity: 1,
    };

    const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'path',
        zIndex: maxZIndex + 1,
        parentId: null,
        data: newElementData,
    };

    return { newElement, elementsToRemove };
}
