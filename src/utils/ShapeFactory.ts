import type { Point, Command, ControlPoint } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';
import { BEZIER_CIRCLE_KAPPA } from './bezierCircle';

/**
 * Helper functions for creating formatted points and commands
 */
function createFormattedPoint(x: number, y: number): Point {
    return {
        x: formatToPrecision(x, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(y, PATH_DECIMAL_PRECISION)
    };
}

function createMoveCommand(x: number, y: number): Command {
    return { type: 'M', position: createFormattedPoint(x, y) };
}

function createLineCommand(x: number, y: number): Command {
    return { type: 'L', position: createFormattedPoint(x, y) };
}

/**
 * Generate shape commands directly without SVG serialization
 */
export function createSquareCommands(centerX: number, centerY: number, halfSize: number): Command[] {
    return [
        createMoveCommand(centerX - halfSize, centerY - halfSize),
        createLineCommand(centerX + halfSize, centerY - halfSize),
        createLineCommand(centerX + halfSize, centerY + halfSize),
        createLineCommand(centerX - halfSize, centerY + halfSize),
        { type: 'Z' }
    ];
}

export function createRectangleCommands(startX: number, startY: number, endX: number, endY: number): Command[] {
    return [
        createMoveCommand(startX, startY),
        createLineCommand(endX, startY),
        createLineCommand(endX, endY),
        createLineCommand(startX, endY),
        { type: 'Z' }
    ];
}

export function createLineCommands(startX: number, startY: number, endX: number, endY: number): Command[] {
    return [
        createMoveCommand(startX, startY),
        createLineCommand(endX, endY),
    ];
}

export function createDiamondCommands(centerX: number, centerY: number, halfWidth: number, halfHeight: number): Command[] {
    return [
        createMoveCommand(centerX, centerY - halfHeight), // Top point
        createLineCommand(centerX + halfWidth, centerY),   // Right point
        createLineCommand(centerX, centerY + halfHeight),  // Bottom point
        createLineCommand(centerX - halfWidth, centerY),   // Left point
        { type: 'Z' }                                     // Close path
    ];
}

export function createHeartCommands(centerX: number, centerY: number, width: number, height: number): Command[] {
    const precision = PATH_DECIMAL_PRECISION;

    // Heart shape based on provided path, scaled to fit the rectangle
    // Original path center: (105, 105), dimensions: 200x200
    const scaleX = width / 200;
    const scaleY = height / 200;
    const offsetX = centerX - 105 * scaleX;
    const offsetY = centerY - 105 * scaleY;

    const scaledPoint = (x: number, y: number) => ({
        x: formatToPrecision(offsetX + x * scaleX, precision),
        y: formatToPrecision(offsetY + y * scaleY, precision)
    });

    const createControlPoint = (x: number, y: number, commandIndex: number, pointIndex: number, anchorX: number, anchorY: number): ControlPoint => ({
        x: formatToPrecision(offsetX + x * scaleX, precision),
        y: formatToPrecision(offsetY + y * scaleY, precision),
        commandIndex,
        pointIndex,
        anchor: scaledPoint(anchorX, anchorY),
        isControl: true
    });

    return [
        // M 105 65
        createMoveCommand(scaledPoint(105, 65).x, scaledPoint(105, 65).y),
        // C 105 25 122 5 155 5
        {
            type: 'C',
            controlPoint1: createControlPoint(105, 25, 1, 0, 155, 5),
            controlPoint2: createControlPoint(122, 5, 1, 1, 155, 5),
            position: scaledPoint(155, 5)
        },
        // C 188 5 205 25 205 65
        {
            type: 'C',
            controlPoint1: createControlPoint(188, 5, 2, 0, 205, 65),
            controlPoint2: createControlPoint(205, 25, 2, 1, 205, 65),
            position: scaledPoint(205, 65)
        },
        // C 205 92 188 118 155 145
        {
            type: 'C',
            controlPoint1: createControlPoint(205, 92, 3, 0, 155, 145),
            controlPoint2: createControlPoint(188, 118, 3, 1, 155, 145),
            position: scaledPoint(155, 145)
        },
        // C 122 172 105 192 105 205
        {
            type: 'C',
            controlPoint1: createControlPoint(122, 172, 4, 0, 105, 205),
            controlPoint2: createControlPoint(105, 192, 4, 1, 105, 205),
            position: scaledPoint(105, 205)
        },
        // C 105 192 88 172 55 145
        {
            type: 'C',
            controlPoint1: createControlPoint(105, 192, 5, 0, 55, 145),
            controlPoint2: createControlPoint(88, 172, 5, 1, 55, 145),
            position: scaledPoint(55, 145)
        },
        // C 22 118 5 92 5 65
        {
            type: 'C',
            controlPoint1: createControlPoint(22, 118, 6, 0, 5, 65),
            controlPoint2: createControlPoint(5, 92, 6, 1, 5, 65),
            position: scaledPoint(5, 65)
        },
        // C 5 25 22 5 55 5
        {
            type: 'C',
            controlPoint1: createControlPoint(5, 25, 7, 0, 55, 5),
            controlPoint2: createControlPoint(22, 5, 7, 1, 55, 5),
            position: scaledPoint(55, 5)
        },
        // C 88 5 105 25 105 65
        {
            type: 'C',
            controlPoint1: createControlPoint(88, 5, 8, 0, 105, 65),
            controlPoint2: createControlPoint(105, 25, 8, 1, 105, 65),
            position: scaledPoint(105, 65)
        },
    ];
}

export function createCircleCommands(centerX: number, centerY: number, radius: number): Command[] {
    const kappa = BEZIER_CIRCLE_KAPPA; // Improved control point constant for circle approximation
    const precision = PATH_DECIMAL_PRECISION;

    return [
        { type: 'M', position: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) } },
        {
            type: 'C',
            controlPoint1: {
                x: formatToPrecision(centerX - radius, precision),
                y: formatToPrecision(centerY - radius * kappa, precision),
                commandIndex: 1,
                pointIndex: 0,
                anchor: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) },
                isControl: true
            },
            controlPoint2: {
                x: formatToPrecision(centerX - radius * kappa, precision),
                y: formatToPrecision(centerY - radius, precision),
                commandIndex: 1,
                pointIndex: 1,
                anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) },
                isControl: true
            },
            position: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) }
        },
        {
            type: 'C',
            controlPoint1: {
                x: formatToPrecision(centerX + radius * kappa, precision),
                y: formatToPrecision(centerY - radius, precision),
                commandIndex: 2,
                pointIndex: 0,
                anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) },
                isControl: true
            },
            controlPoint2: {
                x: formatToPrecision(centerX + radius, precision),
                y: formatToPrecision(centerY - radius * kappa, precision),
                commandIndex: 2,
                pointIndex: 1,
                anchor: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) },
                isControl: true
            },
            position: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) }
        },
        {
            type: 'C',
            controlPoint1: {
                x: formatToPrecision(centerX + radius, precision),
                y: formatToPrecision(centerY + radius * kappa, precision),
                commandIndex: 3,
                pointIndex: 0,
                anchor: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) },
                isControl: true
            },
            controlPoint2: {
                x: formatToPrecision(centerX + radius * kappa, precision),
                y: formatToPrecision(centerY + radius, precision),
                commandIndex: 3,
                pointIndex: 1,
                anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) },
                isControl: true
            },
            position: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) }
        },
        {
            type: 'C',
            controlPoint1: {
                x: formatToPrecision(centerX - radius * kappa, precision),
                y: formatToPrecision(centerY + radius, precision),
                commandIndex: 4,
                pointIndex: 0,
                anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) },
                isControl: true
            },
            controlPoint2: {
                x: formatToPrecision(centerX - radius, precision),
                y: formatToPrecision(centerY + radius * kappa, precision),
                commandIndex: 4,
                pointIndex: 1,
                anchor: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) },
                isControl: true
            },
            position: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) }
        },
        { type: 'Z' }
    ];
}

export function createTriangleCommands(centerX: number, startY: number, endX: number, endY: number, startX: number): Command[] {
    return [
        createMoveCommand(centerX, startY),
        createLineCommand(endX, endY),
        createLineCommand(startX, endY),
        { type: 'Z' }
    ];
}
