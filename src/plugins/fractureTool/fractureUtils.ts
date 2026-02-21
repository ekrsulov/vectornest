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
 * Generate random seed points within given bounds.
 */
function generateSeedPoints(
    bounds: paper.Rectangle,
    numSeeds: number,
    pattern: 'voronoi' | 'grid' | 'radial'
): paper.Point[] {
    const seeds: paper.Point[] = [];

    if (pattern === 'grid') {
        const cols = Math.ceil(Math.sqrt(numSeeds));
        const rows = Math.ceil(numSeeds / cols);
        const cellW = bounds.width / cols;
        const cellH = bounds.height / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (seeds.length >= numSeeds) break;
                const jitterX = (Math.random() - 0.5) * cellW * 0.6;
                const jitterY = (Math.random() - 0.5) * cellH * 0.6;
                seeds.push(
                    new paper.Point(
                        bounds.left + (c + 0.5) * cellW + jitterX,
                        bounds.top + (r + 0.5) * cellH + jitterY
                    )
                );
            }
        }
    } else if (pattern === 'radial') {
        const center = bounds.center;
        const maxR = Math.min(bounds.width, bounds.height) / 2;
        for (let i = 0; i < numSeeds; i++) {
            const angle = (i / numSeeds) * Math.PI * 2 + Math.random() * 0.3;
            const r = maxR * (0.2 + Math.random() * 0.8);
            seeds.push(
                new paper.Point(
                    center.x + Math.cos(angle) * r,
                    center.y + Math.sin(angle) * r
                )
            );
        }
    } else {
        // Voronoi: purely random
        for (let i = 0; i < numSeeds; i++) {
            seeds.push(
                new paper.Point(
                    bounds.left + Math.random() * bounds.width,
                    bounds.top + Math.random() * bounds.height
                )
            );
        }
    }

    return seeds;
}

/**
 * Create a Voronoi-like cell polygon for a seed point by intersecting the
 * element bounds with half-planes defined by perpendicular bisectors
 * against other seed points.
 */
function buildVoronoiCell(
    seed: paper.Point,
    allSeeds: paper.Point[],
    boundingRect: paper.Path.Rectangle
): paper.PathItem {
    let cell: paper.PathItem = boundingRect.clone() as paper.PathItem;

    for (const other of allSeeds) {
        if (seed.equals(other)) continue;

        // Perpendicular bisector half-plane
        const mid = seed.add(other).divide(2);
        const dir = other.subtract(seed).normalize();
        const perp = new paper.Point(-dir.y, dir.x);

        // Create a large polygon representing the half-plane on the seed's side
        const halfPlane = new paper.Path();
        const big = 5000;
        halfPlane.add(mid.add(perp.multiply(big)));
        halfPlane.add(mid.subtract(perp.multiply(big)));
        halfPlane.add(mid.subtract(perp.multiply(big)).subtract(dir.multiply(big)));
        halfPlane.add(mid.add(perp.multiply(big)).subtract(dir.multiply(big)));
        halfPlane.closed = true;

        try {
            const clipped: paper.PathItem = cell.intersect(halfPlane);
            cell.remove();
            halfPlane.remove();
            cell = clipped;
        } catch {
            halfPlane.remove();
        }
    }

    return cell;
}

/**
 * Fractures an element into multiple pieces using a Voronoi-like subdivision.
 * Each piece is the intersection of the original path with a Voronoi cell.
 */
export function fractureElement(
    element: CanvasElement,
    numPieces: number,
    pattern: 'voronoi' | 'grid' | 'radial',
    existingElements: CanvasElement[]
): { newElements: CanvasElement[]; elementToRemove: string } | null {
    ensurePaperSetup();

    if (element.type !== 'path') return null;

    const data = element.data as PathData;
    const paperEl = convertPathDataToPaperPath(data);
    applyElementTransformToPaper(paperEl, data);

    // Ensure the path is closed for intersection operations
    if (paperEl instanceof paper.Path && !paperEl.closed) {
        paperEl.closed = true;
    }

    const bounds = paperEl.bounds;
    if (bounds.width < 1 || bounds.height < 1) {
        paperEl.remove();
        return null;
    }

    const seeds = generateSeedPoints(bounds, numPieces, pattern);
    if (seeds.length < 2) {
        paperEl.remove();
        return null;
    }

    const boundingRect = new paper.Path.Rectangle({
        rectangle: bounds.expand(10),
    });

    const maxZIndex = existingElements.reduce(
        (max, el) => Math.max(max, el.zIndex ?? 0),
        -1
    );

    const newElements: CanvasElement[] = [];
    let zIndex = maxZIndex + 1;

    for (const seed of seeds) {
        const cell = buildVoronoiCell(seed, seeds, boundingRect);

        try {
            const piece: paper.PathItem = paperEl.intersect(cell);
            cell.remove();

            // Check if the piece has meaningful area
            const hasArea =
                piece instanceof paper.Path
                    ? Math.abs(piece.area) > 0.5
                    : piece instanceof paper.CompoundPath
                        ? piece.children.some(
                            (c) => c instanceof paper.Path && Math.abs(c.area) > 0.5
                        )
                        : false;

            if (!hasArea) {
                piece.remove();
                continue;
            }

            const pieceData = convertPaperPathToPathData(
                piece as paper.Path | paper.CompoundPath
            );
            piece.remove();

            if (pieceData.subPaths.length === 0) continue;

            const newElementData: PathData = {
                ...(data as PathData),
                subPaths: pieceData.subPaths,
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
        } catch {
            cell.remove();
        }
    }

    boundingRect.remove();
    paperEl.remove();

    if (newElements.length < 2) return null;

    return { newElements, elementToRemove: element.id };
}
