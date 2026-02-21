import paper from 'paper';
import type { CanvasElement, PathData, Point } from '../../types';
import { ensurePaperSetup } from '../../utils/pathOperations/paperSetup';
import { convertPaperPathToPathData } from '../../utils/pathOperations/converters/fromPaperPath';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Generate a random point within a circle.
 */
function randomInCircle(center: Point, radius: number): { point: Point; dist: number } {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    return {
        point: {
            x: center.x + r * Math.cos(angle),
            y: center.y + r * Math.sin(angle),
        },
        dist: r / radius, // normalized distance from center (0-1)
    };
}

/**
 * Calculate dot size based on distribution mode and distance from center.
 */
function getDotSize(
    minSize: number,
    maxSize: number,
    normalizedDist: number,
    distribution: 'uniform' | 'center-heavy' | 'edge-heavy'
): number {
    const range = maxSize - minSize;
    switch (distribution) {
        case 'center-heavy':
            // Larger dots near center
            return minSize + range * (1 - normalizedDist) * Math.random();
        case 'edge-heavy':
            // Larger dots near edges
            return minSize + range * normalizedDist * Math.random();
        case 'uniform':
        default:
            return minSize + range * Math.random();
    }
}

/**
 * Creates stipple dots along a brush stroke. Each point in the stroke
 * generates multiple scattered dots within the brush radius, with sizes
 * varying based on the distribution mode.
 */
export function createStippleDots(
    strokePoints: Point[],
    brushRadius: number,
    dotSizeMin: number,
    dotSizeMax: number,
    density: number,
    distribution: 'uniform' | 'center-heavy' | 'edge-heavy',
    fillColor: string,
    existingElements: CanvasElement[]
): CanvasElement[] {
    ensurePaperSetup();

    if (strokePoints.length === 0) return [];

    const maxZIndex = existingElements.reduce(
        (max, element) => Math.max(max, element.zIndex ?? 0),
        -1
    );

    const newElements: CanvasElement[] = [];
    let zIndex = maxZIndex + 1;

    // Sample points along the stroke at regular intervals to avoid clustering
    const sampledPoints: Point[] = [strokePoints[0]];
    const minDist = brushRadius * 0.4;

    for (let i = 1; i < strokePoints.length; i++) {
        const prev = sampledPoints[sampledPoints.length - 1];
        const curr = strokePoints[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        if (dx * dx + dy * dy >= minDist * minDist) {
            sampledPoints.push(curr);
        }
    }

    for (const center of sampledPoints) {
        for (let i = 0; i < density; i++) {
            const { point: dotCenter, dist } = randomInCircle(center, brushRadius);
            const dotRadius = getDotSize(dotSizeMin, dotSizeMax, dist, distribution);

            const circle = new paper.Path.Circle({
                center: new paper.Point(dotCenter.x, dotCenter.y),
                radius: Math.max(0.2, dotRadius),
            });

            const pathData = convertPaperPathToPathData(circle);
            circle.remove();

            if (pathData.subPaths.length === 0) continue;

            const newElementData: PathData = {
                subPaths: pathData.subPaths,
                fillColor,
                fillOpacity: 0.7 + Math.random() * 0.3,
                strokeColor: 'none',
                strokeOpacity: 1,
                strokeWidth: 0,
                fillRule: 'nonzero',
                opacity: 1,
            };

            newElements.push({
                id: uuidv4(),
                type: 'path',
                zIndex: zIndex++,
                parentId: null,
                data: newElementData,
            });
        }
    }

    return newElements;
}
