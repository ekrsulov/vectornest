import type { Command, Point } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';
import { mapCommandPoints } from './commandPointMapper';

/**
 * Transform a point by scaling and translation
 * @internal - Used only within transformCommands
 */
function transformPoint(
  point: Point,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): Point {
  return {
    x: formatToPrecision((point.x - originX) * scaleX + originX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision((point.y - originY) * scaleY + originY, PATH_DECIMAL_PRECISION),
  };
}

/**
 * Rotate a point around a center using precomputed trig values
 * @internal - Used only within transformCommands
 */
function rotatePoint(
  point: Point,
  cos: number,
  sin: number,
  centerX: number,
  centerY: number
): Point {
  const x = point.x - centerX;
  const y = point.y - centerY;

  return {
    x: formatToPrecision(x * cos - y * sin + centerX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(x * sin + y * cos + centerY, PATH_DECIMAL_PRECISION),
  };
}

/**
 * Transform a collection of commands with scaling, rotation and stroke width updates
 * This centralizes the logic that was duplicated across transformPathData, transformSubpathsData, and transformSingleSubpath
 */
export function transformCommands(
  commands: Command[],
  options: {
    scaleX: number;
    scaleY: number;
    originX: number;
    originY: number;
    rotation?: number;
    rotationCenterX?: number;
    rotationCenterY?: number;
  }
): Command[] {
  const {
    scaleX,
    scaleY,
    originX,
    originY,
    rotation = 0,
    rotationCenterX = originX,
    rotationCenterY = originY
  } = options;

  // Precompute trig values once instead of per-point
  const cos = rotation !== 0 ? Math.cos((rotation * Math.PI) / 180) : 1;
  const sin = rotation !== 0 ? Math.sin((rotation * Math.PI) / 180) : 0;

  return mapCommandPoints(commands, (point) => {
    let result = transformPoint(point, scaleX, scaleY, originX, originY);
    if (rotation !== 0) {
      result = rotatePoint(result, cos, sin, rotationCenterX, rotationCenterY);
    }
    return result;
  });
}

/**
 * Calculate new stroke width after scaling transformation
 * Always rounds to integer values for cleaner strokes
 * Ensures a minimum of 1px to keep strokes visible
 */
export function calculateScaledStrokeWidth(
  originalStrokeWidth: number,
  scaleX: number,
  scaleY: number
): number {
  // If stroke width is 0, keep it 0 (no stroke)
  if (originalStrokeWidth === 0) {
    return 0;
  }
  const scaledWidth = originalStrokeWidth * Math.min(Math.abs(scaleX), Math.abs(scaleY));
  // Round to nearest integer and ensure minimum of 1px
  return Math.max(1, Math.round(scaledWidth));
}
