import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';

export interface ZoomLimits {
    min: number;
    max: number;
}

export interface Point2D {
    x: number;
    y: number;
}

export interface GesturePanParams {
    initialMidpoint: Point2D;
    currentMidpoint: Point2D;
    initialPan: Point2D;
    zoomRatio: number;
    svgRect: DOMRect;
}

/**
 * Calculates the new zoom level based on pinch gesture
 * 
 * @param currentDistance - Current distance between two touch points
 * @param initialDistance - Initial distance when gesture started
 * @param initialZoom - Initial zoom level when gesture started
 * @param limits - Min and max zoom limits
 * @returns New zoom level clamped to limits
 */
export const calculatePinchZoom = (
    currentDistance: number,
    initialDistance: number,
    initialZoom: number,
    limits: ZoomLimits
): number => {
    const zoomFactor = currentDistance / initialDistance;
    const newZoom = initialZoom * zoomFactor;
    return Math.max(limits.min, Math.min(limits.max, newZoom));
};

/**
 * Calculates the new pan position based on two-finger gesture
 * Keeps content under the midpoint stable during zoom and pan
 * 
 * @param params - Gesture parameters
 * @returns New pan position {x, y}
 */
export const calculateGesturePan = (params: GesturePanParams): Point2D => {
    const { initialMidpoint, currentMidpoint, initialPan, zoomRatio, svgRect } = params;

    // Calculate relative positions within the SVG element
    const initialMidpointRelative = {
        x: initialMidpoint.x - svgRect.left,
        y: initialMidpoint.y - svgRect.top,
    };

    const currentMidpointRelative = {
        x: currentMidpoint.x - svgRect.left,
        y: currentMidpoint.y - svgRect.top,
    };

    // Adjust pan to keep the midpoint stable during zoom
    let newPanX = initialMidpointRelative.x - (initialMidpointRelative.x - initialPan.x) * zoomRatio;
    let newPanY = initialMidpointRelative.y - (initialMidpointRelative.y - initialPan.y) * zoomRatio;

    // Add the delta from finger movement
    const midpointDeltaX = currentMidpointRelative.x - initialMidpointRelative.x;
    const midpointDeltaY = currentMidpointRelative.y - initialMidpointRelative.y;

    newPanX += midpointDeltaX;
    newPanY += midpointDeltaY;

    return {
        x: formatToPrecision(newPanX, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(newPanY, PATH_DECIMAL_PRECISION),
    };
};
