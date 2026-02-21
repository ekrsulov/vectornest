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
 * Stamp copies of a source element along a brush stroke path.
 * Creates path elements at evenly spaced intervals along the stroke,
 * with optional random scale and rotation variation.
 */
export function createStampedCopies(
    sourceElement: CanvasElement,
    brushPoints: Point[],
    spacing: number,
    scaleVariation: number,
    rotationVariation: number,
    sizeMultiplier: number,
    existingElements: CanvasElement[]
): CanvasElement[] {
    ensurePaperSetup();

    if (brushPoints.length < 2 || sourceElement.type !== 'path') return [];

    const sourceData = sourceElement.data as PathData;
    const sourcePaper = convertPathDataToPaperPath(sourceData);
    applyElementTransformToPaper(sourcePaper, sourceData);

    // Build the brush stroke path
    const strokePath = new paper.Path();
    for (const p of brushPoints) {
        strokePath.add(new paper.Point(p.x, p.y));
    }
    strokePath.simplify(1);

    if (strokePath.length < 1) {
        strokePath.remove();
        sourcePaper.remove();
        return [];
    }

    const maxZIndex = existingElements.reduce(
        (max, element) => Math.max(max, element.zIndex ?? 0),
        -1
    );

    const sourceCenter = sourcePaper.bounds.center;
    const stampCount = Math.max(1, Math.floor(strokePath.length / spacing));
    const newElements: CanvasElement[] = [];
    let zIndex = maxZIndex + 1;

    for (let i = 0; i <= stampCount; i++) {
        const t = Math.min(i * spacing, strokePath.length);
        const stampPoint = strokePath.getPointAt(t);
        const tangent = strokePath.getTangentAt(t);
        if (!stampPoint) continue;

        // Clone the source and transform it
        const clone = sourcePaper.clone() as paper.PathItem;

        // Move to stamp position (translate relative to source center)
        const offset = stampPoint.subtract(sourceCenter);
        clone.translate(offset);

        // Apply size multiplier
        const scaleRand = sizeMultiplier + (Math.random() - 0.5) * 2 * scaleVariation * sizeMultiplier;
        const finalScale = Math.max(0.1, scaleRand);
        clone.scale(finalScale, stampPoint);

        // Apply rotation (follow path direction + random variation)
        if (tangent) {
            const baseAngle = tangent.angle;
            const randAngle = (Math.random() - 0.5) * 2 * rotationVariation;
            clone.rotate(baseAngle + randAngle, stampPoint);
        } else if (rotationVariation > 0) {
            clone.rotate((Math.random() - 0.5) * 2 * rotationVariation, stampPoint);
        }

        const pathData = convertPaperPathToPathData(clone as paper.Path | paper.CompoundPath);
        clone.remove();

        if (pathData.subPaths.length === 0) continue;

        const newElementData: PathData = {
            ...sourceData,
            subPaths: pathData.subPaths,
            transform: undefined,
            transformMatrix: undefined,
        };

        newElements.push({
            id: uuidv4(),
            type: 'path',
            zIndex: zIndex++,
            parentId: null,
            data: newElementData,
        });
    }

    strokePath.remove();
    sourcePaper.remove();

    return newElements;
}
