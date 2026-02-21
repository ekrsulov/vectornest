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
 * Creates a coil/spring path that wraps around the user's freehand spine path.
 * The coil oscillates perpendicular to the spine at the given radius and turn count.
 */
export function createCoilPath(
    points: Point[],
    coilRadius: number,
    turns: number,
    taper: boolean,
    strokeColor: string,
    strokeWidth: number,
    existingElements: CanvasElement[]
): CanvasElement | null {
    ensurePaperSetup();

    if (points.length < 2) return null;

    const spine = new paper.Path();
    for (const p of points) {
        spine.add(new paper.Point(p.x, p.y));
    }
    spine.simplify(1);

    if (spine.length < 2) {
        spine.remove();
        return null;
    }

    const totalLength = spine.length;
    const totalAngle = turns * Math.PI * 2;
    const numSteps = turns * 24; // 24 points per revolution for smoothness
    const stepLength = totalLength / numSteps;

    const coilPath = new paper.Path();

    for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(i * stepLength, totalLength);
        const point = spine.getPointAt(t);
        const normal = spine.getNormalAt(t);
        if (!point || !normal) continue;

        const progress = i / numSteps;
        const angle = progress * totalAngle;
        const sinVal = Math.sin(angle);

        // Apply taper: radius decreases toward start/end
        let effectiveRadius = coilRadius;
        if (taper) {
            const taperFactor = Math.sin(progress * Math.PI); // 0 at start/end, 1 at center
            effectiveRadius = coilRadius * Math.max(0.1, taperFactor);
        }

        coilPath.add(point.add(normal.multiply(effectiveRadius * sinVal)));
    }

    spine.remove();
    coilPath.simplify(0.5);

    const pathData = convertPaperPathToPathData(coilPath);
    coilPath.remove();

    if (pathData.subPaths.length === 0) return null;

    const maxZIndex = existingElements.reduce(
        (max, element) => Math.max(max, element.zIndex ?? 0),
        -1
    );

    const newElementData: PathData = {
        subPaths: pathData.subPaths,
        fillColor: 'none',
        fillOpacity: 1,
        strokeColor,
        strokeOpacity: 1,
        strokeWidth,
        fillRule: 'nonzero',
        opacity: 1,
    };

    return {
        id: uuidv4(),
        type: 'path',
        zIndex: maxZIndex + 1,
        parentId: null,
        data: newElementData,
    };
}
