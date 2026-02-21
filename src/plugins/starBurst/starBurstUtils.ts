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
 * Creates a star burst shape at the given center with the outer radius
 * determined by the distance from center to the drag end point.
 */
export function createStarBurst(
    center: Point,
    outerRadius: number,
    rays: number,
    innerRadiusRatio: number,
    rayStyle: 'pointed' | 'rounded' | 'flat',
    fillColor: string,
    strokeColor: string,
    strokeWidth: number,
    existingElements: CanvasElement[]
): CanvasElement | null {
    ensurePaperSetup();

    if (outerRadius < 2) return null;

    const innerRadius = outerRadius * innerRadiusRatio;
    const centerPt = new paper.Point(center.x, center.y);
    const path = new paper.Path();

    const angleStep = (Math.PI * 2) / rays;

    if (rayStyle === 'pointed') {
        // Classic star burst with sharp points
        for (let i = 0; i < rays; i++) {
            const outerAngle = i * angleStep - Math.PI / 2;
            const innerAngle = outerAngle + angleStep / 2;

            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(outerAngle) * outerRadius,
                        Math.sin(outerAngle) * outerRadius
                    )
                )
            );
            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(innerAngle) * innerRadius,
                        Math.sin(innerAngle) * innerRadius
                    )
                )
            );
        }
        path.closed = true;
    } else if (rayStyle === 'rounded') {
        // Star burst with smooth curves between points
        for (let i = 0; i < rays; i++) {
            const outerAngle = i * angleStep - Math.PI / 2;
            const innerAngle = outerAngle + angleStep / 2;

            path.add(
                new paper.Segment(
                    centerPt.add(
                        new paper.Point(
                            Math.cos(outerAngle) * outerRadius,
                            Math.sin(outerAngle) * outerRadius
                        )
                    )
                )
            );
            path.add(
                new paper.Segment(
                    centerPt.add(
                        new paper.Point(
                            Math.cos(innerAngle) * innerRadius,
                            Math.sin(innerAngle) * innerRadius
                        )
                    )
                )
            );
        }
        path.closed = true;
        path.smooth({ type: 'catmull-rom', factor: 0.3 });
    } else {
        // Flat-topped rays (trapezoidal rays)
        const halfRayWidth = angleStep * 0.15;
        for (let i = 0; i < rays; i++) {
            const baseAngle = i * angleStep - Math.PI / 2;

            // Inner left
            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(baseAngle - halfRayWidth) * innerRadius,
                        Math.sin(baseAngle - halfRayWidth) * innerRadius
                    )
                )
            );
            // Outer left
            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(baseAngle - halfRayWidth * 0.6) * outerRadius,
                        Math.sin(baseAngle - halfRayWidth * 0.6) * outerRadius
                    )
                )
            );
            // Outer right
            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(baseAngle + halfRayWidth * 0.6) * outerRadius,
                        Math.sin(baseAngle + halfRayWidth * 0.6) * outerRadius
                    )
                )
            );
            // Inner right
            path.add(
                centerPt.add(
                    new paper.Point(
                        Math.cos(baseAngle + halfRayWidth) * innerRadius,
                        Math.sin(baseAngle + halfRayWidth) * innerRadius
                    )
                )
            );
        }
        path.closed = true;
    }

    const pathData = convertPaperPathToPathData(path);
    path.remove();

    if (pathData.subPaths.length === 0) return null;

    const maxZIndex = existingElements.reduce(
        (max, element) => Math.max(max, element.zIndex ?? 0),
        -1
    );

    const newElementData: PathData = {
        subPaths: pathData.subPaths,
        fillColor,
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
