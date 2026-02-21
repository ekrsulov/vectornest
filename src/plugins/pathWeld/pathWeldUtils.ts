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
 * Builds a stroke contour shape along the weld path to define the weld area.
 */
function buildWeldStroke(weldPath: paper.Path, halfWidth: number): paper.Path {
    const contour = new paper.Path();

    if (weldPath.length < 1) {
        const center = weldPath.firstSegment?.point ?? new paper.Point(0, 0);
        const circle = new paper.Path.Circle({ center, radius: halfWidth });
        return circle;
    }

    const numSteps = Math.max(8, Math.ceil(weldPath.length / 2));
    const stepLen = weldPath.length / numSteps;

    // Forward pass
    for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(i * stepLen, weldPath.length);
        const point = weldPath.getPointAt(t);
        const normal = weldPath.getNormalAt(t);
        if (point && normal) contour.add(point.add(normal.multiply(halfWidth)));
    }

    // Backward pass
    for (let i = numSteps; i >= 0; i--) {
        const t = Math.min(i * stepLen, weldPath.length);
        const point = weldPath.getPointAt(t);
        const normal = weldPath.getNormalAt(t);
        if (point && normal) contour.add(point.subtract(normal.multiply(halfWidth)));
    }

    contour.closed = true;
    return contour;
}

/**
 * Check if a Paper.js path item contains any open (unclosed) paths.
 */
function isPathItemOpen(pathItem: paper.PathItem): boolean {
    if (pathItem instanceof paper.Path) return !pathItem.closed;
    if (pathItem instanceof paper.CompoundPath) {
        return pathItem.children.some(
            (c) => c instanceof paper.Path && !c.closed
        );
    }
    return false;
}

/**
 * Expand an open path into a closed outline by tracing both sides of the stroke.
 * This allows boolean operations (unite, intersect) on paths that have no area.
 */
function expandOpenPathToOutline(openPath: paper.Path, strokeWidth: number): paper.Path {
    const halfWidth = Math.max(strokeWidth / 2, 0.5);

    if (openPath.length < 0.1) {
        const center = openPath.firstSegment?.point ?? new paper.Point(0, 0);
        return new paper.Path.Circle({ center, radius: halfWidth });
    }

    const contour = new paper.Path();
    const numSteps = Math.max(8, Math.ceil(openPath.length / 2));
    const stepLen = openPath.length / numSteps;

    // Forward side (offset by +normal)
    for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(i * stepLen, openPath.length);
        const point = openPath.getPointAt(t);
        const normal = openPath.getNormalAt(t);
        if (point && normal) contour.add(point.add(normal.multiply(halfWidth)));
    }

    // Backward side (offset by -normal)
    for (let i = numSteps; i >= 0; i--) {
        const t = Math.min(i * stepLen, openPath.length);
        const point = openPath.getPointAt(t);
        const normal = openPath.getNormalAt(t);
        if (point && normal) contour.add(point.subtract(normal.multiply(halfWidth)));
    }

    contour.closed = true;
    return contour;
}

/**
 * Convert a path item to a closed form suitable for boolean operations.
 * Closed paths are returned as-is. Open paths are expanded into closed outlines
 * based on their stroke width so that unite() can work on them.
 */
function ensureClosedForBoolean(
    pathItem: paper.PathItem,
    strokeWidth: number
): { result: paper.PathItem; wasExpanded: boolean } {
    if (!isPathItemOpen(pathItem)) {
        return { result: pathItem, wasExpanded: false };
    }

    if (pathItem instanceof paper.Path && !pathItem.closed) {
        const expanded = expandOpenPathToOutline(pathItem, strokeWidth);
        return { result: expanded, wasExpanded: true };
    }

    if (pathItem instanceof paper.CompoundPath) {
        // Expand each open child and unite the pieces together
        let combined: paper.PathItem | null = null;
        for (const child of pathItem.children) {
            if (!(child instanceof paper.Path)) continue;
            let piece: paper.PathItem;
            if (!child.closed) {
                piece = expandOpenPathToOutline(child, strokeWidth);
            } else {
                piece = child.clone() as paper.Path;
            }
            if (!combined) {
                combined = piece;
            } else {
                try {
                    const u: paper.PathItem = combined.unite(piece);
                    combined.remove();
                    piece.remove();
                    combined = u;
                } catch {
                    piece.remove();
                }
            }
        }
        if (combined) {
            return { result: combined, wasExpanded: true };
        }
    }

    return { result: pathItem, wasExpanded: false };
}

/**
 * Welds (unites) all path elements that intersect with the weld stroke.
 * The weld stroke is defined by the user's freehand drawing.
 * Supports both closed paths (direct boolean unite) and open paths (expanded
 * to closed outlines via stroke width before unite).
 * Returns a single merged element plus the list of elements to remove.
 */
export function weldElementsWithPath(
    elements: CanvasElement[],
    weldSvgPathString: string,
    weldWidth: number
): { newElement: CanvasElement | null; elementsToRemove: string[] } {
    ensurePaperSetup();

    const elementsToRemove: string[] = [];

    const weldPath = new paper.Path(weldSvgPathString);
    if (weldPath.length < 1) {
        weldPath.remove();
        return { newElement: null, elementsToRemove };
    }
    weldPath.simplify(0.5);

    const weldStroke = buildWeldStroke(weldPath, weldWidth / 2);
    weldPath.remove();

    if (weldStroke.segments.length < 3) {
        weldStroke.remove();
        return { newElement: null, elementsToRemove };
    }

    // Collect elements that intersect with the weld stroke
    let mergedShape: paper.PathItem | null = null;
    let firstElement: CanvasElement | null = null;

    for (const el of elements) {
        if (el.type !== 'path') continue;

        const data = el.data as PathData;
        let paperEl: paper.PathItem = convertPathDataToPaperPath(data);
        applyElementTransformToPaper(paperEl, data);

        // For open paths, expand into closed outlines so boolean ops work
        const { result: booleanEl, wasExpanded } = ensureClosedForBoolean(
            paperEl,
            data.strokeWidth ?? 1
        );
        if (wasExpanded) {
            paperEl.remove();
            paperEl = booleanEl;
        }

        if (!weldStroke.bounds.intersects(paperEl.bounds)) {
            paperEl.remove();
            continue;
        }

        // Check if the weld stroke actually crosses this element
        try {
            const intersection = weldStroke.intersect(paperEl);
            const hasIntersection =
                intersection instanceof paper.Path
                    ? Math.abs(intersection.area) > 0.1
                    : intersection instanceof paper.CompoundPath
                        ? intersection.children.some(
                            (c) => c instanceof paper.Path && Math.abs(c.area) > 0.1
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

        // Unite this element with the accumulated shape
        try {
            if (!mergedShape) {
                mergedShape = paperEl;
                firstElement = el;
            } else {
                const united: paper.PathItem = mergedShape.unite(paperEl);
                if (
                    united &&
                    (united instanceof paper.Path || united instanceof paper.CompoundPath)
                ) {
                    mergedShape.remove();
                    mergedShape = united;
                }
                paperEl.remove();
            }
            elementsToRemove.push(el.id);
        } catch {
            paperEl.remove();
        }
    }

    weldStroke.remove();

    if (!mergedShape || !firstElement || elementsToRemove.length < 2) {
        // Need at least 2 elements to weld
        mergedShape?.remove();
        return { newElement: null, elementsToRemove: [] };
    }

    // Convert result back
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
            // Clear transforms since the result is already in canvas space
            transform: undefined,
            transformMatrix: undefined,
        },
    };

    return { newElement, elementsToRemove };
}
