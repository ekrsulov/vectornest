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
 * Builds a closed bridge contour from a freehand stroke with a given width.
 */
function buildBridgeContour(
    bridgePath: paper.Path,
    halfWidth: number
): paper.Path {
    if (bridgePath.length < 1) {
        const center = bridgePath.firstSegment?.point ?? new paper.Point(0, 0);
        return new paper.Path.Circle({ center, radius: halfWidth });
    }

    const numSteps = Math.max(8, Math.ceil(bridgePath.length / 2));
    const stepLen = bridgePath.length / numSteps;
    const contour = new paper.Path();

    // Forward pass (offset by +normal)
    for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(i * stepLen, bridgePath.length);
        const point = bridgePath.getPointAt(t);
        const normal = bridgePath.getNormalAt(t);
        if (point && normal) contour.add(point.add(normal.multiply(halfWidth)));
    }

    // Backward pass (offset by -normal)
    for (let i = numSteps; i >= 0; i--) {
        const t = Math.min(i * stepLen, bridgePath.length);
        const point = bridgePath.getPointAt(t);
        const normal = bridgePath.getNormalAt(t);
        if (point && normal) contour.add(point.subtract(normal.multiply(halfWidth)));
    }

    contour.closed = true;
    return contour;
}

/**
 * Bridge (connect) two or more separate path elements by drawing a freehand stroke.
 * The bridge is a closed contour shape that is united with all intersecting paths.
 */
export function bridgeElements(
    elements: CanvasElement[],
    bridgePointsRaw: Point[],
    bridgeWidth: number,
    smooth: boolean
): { newElement: CanvasElement | null; elementsToRemove: string[] } {
    ensurePaperSetup();

    const elementsToRemove: string[] = [];

    // Build the bridge path
    const bridgePath = new paper.Path();
    for (const p of bridgePointsRaw) {
        bridgePath.add(new paper.Point(p.x, p.y));
    }
    if (smooth) bridgePath.simplify(1);

    if (bridgePath.length < 1) {
        bridgePath.remove();
        return { newElement: null, elementsToRemove };
    }

    const bridgeContour = buildBridgeContour(bridgePath, bridgeWidth / 2);
    bridgePath.remove();

    if (bridgeContour.segments.length < 3) {
        bridgeContour.remove();
        return { newElement: null, elementsToRemove };
    }

    // Start with the bridge contour itself as the merged shape
    let mergedShape: paper.PathItem = bridgeContour;
    let firstElement: CanvasElement | null = null;

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        const paperEl = convertPathDataToPaperPath(data);
        applyElementTransformToPaper(paperEl, data);

        // Check if this element's bounds intersect with the bridge contour bounds
        if (!mergedShape.bounds.intersects(paperEl.bounds)) {
            paperEl.remove();
            continue;
        }

        // Check for actual geometric intersection
        try {
            const intersection = mergedShape.intersect(paperEl);
            const hasIntersection =
                intersection instanceof paper.Path
                    ? Math.abs(intersection.area) > 0.01
                    : intersection instanceof paper.CompoundPath
                        ? intersection.children.some(
                            (c) => c instanceof paper.Path && Math.abs(c.area) > 0.01
                        )
                        : false;
            intersection.remove();

            if (!hasIntersection) {
                paperEl.remove();
                continue;
            }
        } catch {
            paperEl.remove();
            continue;
        }

        // Unite with the merged shape
        try {
            const united: paper.PathItem = mergedShape.unite(paperEl);
            if (
                united &&
                (united instanceof paper.Path || united instanceof paper.CompoundPath)
            ) {
                mergedShape.remove();
                mergedShape = united;
            }
            paperEl.remove();
            if (!firstElement) firstElement = el;
            elementsToRemove.push(el.id);
        } catch {
            paperEl.remove();
        }
    }

    if (!firstElement || elementsToRemove.length < 2) {
        // Need at least 2 elements to bridge
        mergedShape.remove();
        return { newElement: null, elementsToRemove: [] };
    }

    const resultData = convertPaperPathToPathData(mergedShape as paper.Path | paper.CompoundPath);
    mergedShape.remove();

    if (resultData.subPaths.length === 0) {
        return { newElement: null, elementsToRemove: [] };
    }

    const firstData = firstElement.data as PathData;
    const newElement: CanvasElement = {
        ...firstElement,
        id: uuidv4(),
        data: {
            ...firstData,
            subPaths: resultData.subPaths,
            transform: undefined,
            transformMatrix: undefined,
        },
    };

    return { newElement, elementsToRemove };
}
