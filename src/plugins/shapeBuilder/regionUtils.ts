import paper from 'paper';
import type { PathData, Point } from '../../types';
import type { Region } from './slice';
import {
    convertPathDataToPaperPath,
    convertPaperPathToPathData,
} from '../../utils/pathOperationsUtils';

interface PathWithId {
    pathData: PathData;
    elementId: string;
}

/**
 * Generates a unique ID for a region
 */
function generateRegionId(): string {
    return `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const MIN_BOUNDS_SIZE = 0.1;
const MIN_AREA = 0.1;

interface Cell {
    path: paper.Path;
    sourceIds: Set<string>;
}

function clonePathItem(item: paper.PathItem): paper.PathItem {
    return item.clone({ insert: false }) as paper.PathItem;
}

function extractPaths(item: paper.PathItem | null): paper.Path[] {
    if (!item || item.isEmpty()) return [];

    if (item instanceof paper.CompoundPath) {
        return item.children.flatMap(child => extractPaths(child as paper.PathItem));
    }

    if (item instanceof paper.Path) {
        return [item];
    }

    return [];
}

function isValidPath(path: paper.Path): boolean {
    const { width, height } = path.bounds;
    const area = Math.abs(path.area);

    return (
        width >= MIN_BOUNDS_SIZE &&
        height >= MIN_BOUNDS_SIZE &&
        Number.isFinite(area) &&
        area >= MIN_AREA
    );
}

function runBooleanOp(
    operation: 'intersect' | 'subtract',
    a: paper.PathItem,
    b: paper.PathItem
): paper.Path[] {
    try {
        const cloneA = clonePathItem(a);
        const cloneB = clonePathItem(b);
        const result = (cloneA as paper.PathItem)[operation](cloneB as paper.PathItem, { insert: false }) as paper.PathItem | null;
        return extractPaths(result).filter(isValidPath);
    } catch (error) {
        console.warn(`Error during boolean operation (${operation}):`, error);
        return [];
    }
}

/**
 * Computes the bounding box of a PathData
 */
function computeBounds(pathData: PathData): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const subPath of pathData.subPaths) {
        for (const cmd of subPath) {
            if (cmd.type === 'M' || cmd.type === 'L') {
                minX = Math.min(minX, cmd.position.x);
                minY = Math.min(minY, cmd.position.y);
                maxX = Math.max(maxX, cmd.position.x);
                maxY = Math.max(maxY, cmd.position.y);
            } else if (cmd.type === 'C') {
                minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
                maxX = Math.max(maxX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                maxY = Math.max(maxY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
            }
        }
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

/**
 * Computes the center point of a bounding box
 */
function computeCenter(bounds: { x: number; y: number; width: number; height: number }): Point {
    return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
    };
}

/**
 * Computes all intersection regions from overlapping paths.
 * Uses Paper.js to:
 * 1. Find all intersections between paths
 * 2. Divide paths at intersection points
 * 3. Identify closed regions (cells)
 * 
 * @param paths Array of path data with element IDs
 * @returns Array of Region objects
 */
export function computeRegionsFromPaths(paths: PathWithId[]): Region[] {
    if (paths.length < 2) return [];

    const cells: Cell[] = [];

    for (const { pathData, elementId } of paths) {
        // Work with a non-inserted clone to avoid mutating the Paper.js project
        const paperPath = convertPathDataToPaperPath(pathData);
        const baseParts = extractPaths(clonePathItem(paperPath)).filter(isValidPath);
        paperPath.remove(); // Clean up inserted path

        if (!baseParts.length) {
            continue;
        }

        const combinedNewPath: paper.PathItem =
            baseParts.length === 1
                ? baseParts[0].clone({ insert: false })
                : (() => {
                    const compound = new paper.CompoundPath({ insert: false });
                    baseParts.forEach(part => compound.addChild(part.clone({ insert: false })));
                    return compound;
                })();

        const nextCells: Cell[] = [];

        // Split existing cells by the new path (intersections + remainders)
        for (const cell of cells) {
            const intersections = runBooleanOp('intersect', cell.path, combinedNewPath);
            intersections.forEach(path => {
                nextCells.push({
                    path,
                    sourceIds: new Set([...cell.sourceIds, elementId]),
                });
            });

            const remainders = runBooleanOp('subtract', cell.path, combinedNewPath);
            remainders.forEach(path => {
                nextCells.push({
                    path,
                    sourceIds: new Set(cell.sourceIds),
                });
            });
        }

        // Parts of the new path that aren't covered by existing cells
        const newExclusiveParts =
            cells.length === 0
                ? extractPaths(combinedNewPath.clone({ insert: false })).filter(isValidPath)
                : runBooleanOp(
                    'subtract',
                    combinedNewPath,
                    cells.length === 1
                        ? clonePathItem(cells[0].path)
                        : (() => {
                            const compound = new paper.CompoundPath({ insert: false });
                            cells.forEach(cell => compound.addChild(cell.path.clone({ insert: false })));
                            return compound;
                        })()
                );

        newExclusiveParts.forEach(path => {
            nextCells.push({
                path,
                sourceIds: new Set([elementId]),
            });
        });

        // Replace accumulated cells with the newly split set
        cells.length = 0;
        cells.push(...nextCells.filter(cell => isValidPath(cell.path)));
    }

    // Convert cells into Region structures
    return cells.map(cell => {
        const pathData = convertPaperPathToPathData(cell.path);
        const bounds = computeBounds(pathData);

        return {
            id: generateRegionId(),
            pathData,
            bounds,
            center: computeCenter(bounds),
            sourceElementIds: Array.from(cell.sourceIds),
        };
    });
}

/**
 * Merges multiple regions into a single path using union operation
 */
export function mergeRegions(regions: Region[]): PathData | null {
    if (regions.length === 0) return null;
    if (regions.length === 1) return regions[0].pathData;

    let result = convertPathDataToPaperPath(regions[0].pathData);

    for (let i = 1; i < regions.length; i++) {
        const nextPath = convertPathDataToPaperPath(regions[i].pathData);
        const united = result.unite(nextPath, { insert: false });
        result = united as paper.Path | paper.CompoundPath;
    }

    return convertPaperPathToPathData(result);
}

/**
 * Checks if a point is inside a region
 */
function isPointInRegion(point: Point, region: Region): boolean {
    // Quick bounding box check first
    const { bounds } = region;
    if (
        point.x < bounds.x ||
        point.x > bounds.x + bounds.width ||
        point.y < bounds.y ||
        point.y > bounds.y + bounds.height
    ) {
        return false;
    }

    // Use Paper.js for precise containment check
    const paperPath = convertPathDataToPaperPath(region.pathData);
    const paperPoint = new paper.Point(point.x, point.y);

    return paperPath.contains(paperPoint);
}

/**
 * Finds the region that contains a given point
 */
export function findRegionAtPoint(point: Point, regions: Region[]): Region | null {
    for (const region of regions) {
        if (isPointInRegion(point, region)) {
            return region;
        }
    }
    return null;
}

/**
 * Finds all regions that intersect with a drag path
 */
export function findRegionsAlongPath(dragPath: Point[], regions: Region[]): Region[] {
    const touchedRegions = new Set<Region>();

    for (const point of dragPath) {
        for (const region of regions) {
            if (isPointInRegion(point, region)) {
                touchedRegions.add(region);
            }
        }
    }

    return Array.from(touchedRegions);
}
