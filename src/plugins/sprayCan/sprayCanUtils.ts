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
 * Generates random points within a circle centered at `center` with given `radius`.
 */
function randomPointInCircle(center: Point, radius: number): Point {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    return {
        x: center.x + r * Math.cos(angle),
        y: center.y + r * Math.sin(angle),
    };
}

/**
 * Creates spray-painted dots as individual small filled circle elements.
 * Each "spray" at a point generates `density` random dots within `sprayRadius`.
 */
export function createSprayDots(
    sprayPoints: Point[],
    sprayRadius: number,
    dotSize: number,
    density: number,
    fillColor: string,
    existingElements: CanvasElement[]
): CanvasElement[] {
    ensurePaperSetup();

    if (sprayPoints.length === 0) return [];

    const maxZIndex = existingElements.reduce(
        (max, element) => Math.max(max, element.zIndex ?? 0),
        -1
    );

    const newElements: CanvasElement[] = [];
    let zIndex = maxZIndex + 1;

    // For each spray point, generate `density` random dots within the spray radius
    for (const center of sprayPoints) {
        for (let i = 0; i < density; i++) {
            const dotCenter = randomPointInCircle(center, sprayRadius);
            const r = dotSize / 2 + Math.random() * (dotSize / 2);

            const circle = new paper.Path.Circle({
                center: new paper.Point(dotCenter.x, dotCenter.y),
                radius: r,
            });

            const pathData = convertPaperPathToPathData(circle);
            circle.remove();

            if (pathData.subPaths.length === 0) continue;

            const newElementData: PathData = {
                subPaths: pathData.subPaths,
                fillColor,
                fillOpacity: 0.6 + Math.random() * 0.4,
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
