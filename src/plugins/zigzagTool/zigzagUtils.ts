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
 * Creates a zigzag-style path along the user's freehand stroke.
 * Supports zigzag, sine, and square wave styles.
 */
export function createZigzagPath(
    points: Point[],
    amplitude: number,
    frequency: number,
    style: 'zigzag' | 'sine' | 'square',
    strokeColor: string,
    strokeWidth: number,
    existingElements: CanvasElement[]
): CanvasElement | null {
    ensurePaperSetup();

    if (points.length < 2) return null;

    // Build the base spine path from freehand points
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
    const stepLength = totalLength / (frequency * 2);
    const resultPath = new paper.Path();
    let side = 1;

    if (style === 'zigzag') {
        for (let i = 0; i <= frequency * 2; i++) {
            const t = Math.min(i * stepLength, totalLength);
            const point = spine.getPointAt(t);
            const normal = spine.getNormalAt(t);
            if (point && normal) {
                resultPath.add(point.add(normal.multiply(amplitude * side)));
            }
            side *= -1;
        }
    } else if (style === 'sine') {
        const numSteps = frequency * 16;
        const stepLen = totalLength / numSteps;
        for (let i = 0; i <= numSteps; i++) {
            const t = Math.min(i * stepLen, totalLength);
            const point = spine.getPointAt(t);
            const normal = spine.getNormalAt(t);
            if (point && normal) {
                const sinVal = Math.sin((i / numSteps) * frequency * Math.PI * 2);
                resultPath.add(point.add(normal.multiply(amplitude * sinVal)));
            }
        }
        resultPath.simplify(0.5);
    } else if (style === 'square') {
        for (let i = 0; i < frequency * 2; i++) {
            const t1 = Math.min(i * stepLength, totalLength);
            const t2 = Math.min((i + 1) * stepLength, totalLength);
            const point1 = spine.getPointAt(t1);
            const normal1 = spine.getNormalAt(t1);
            const point2 = spine.getPointAt(t2);
            const normal2 = spine.getNormalAt(t2);
            if (point1 && normal1) {
                resultPath.add(point1.add(normal1.multiply(amplitude * side)));
            }
            if (point2 && normal2) {
                resultPath.add(point2.add(normal2.multiply(amplitude * side)));
            }
            side *= -1;
        }
    }

    spine.remove();

    const pathData = convertPaperPathToPathData(resultPath);
    resultPath.remove();

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
