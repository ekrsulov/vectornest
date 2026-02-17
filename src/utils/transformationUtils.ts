import type { Command, PathData } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './numberUtils';
import { transformCommands } from './sharedTransformUtils';
import { mapCommandPoints } from './commandPointMapper';

/**
 * Translates commands by deltaX and deltaY with configurable formatting options.
 * This is the main translation function - use this for all translation operations.
 * 
 * @param commands - Array of path commands to translate
 * @param deltaX - X-axis translation amount
 * @param deltaY - Y-axis translation amount
 * @param options - Optional formatting configuration
 * @param options.roundToIntegers - If true, rounds all coordinates to integers
 * @param options.precision - Number of decimal places (default: PATH_DECIMAL_PRECISION)
 * @returns Translated commands array
 */
export function translateCommands(
  commands: Command[], 
  deltaX: number, 
  deltaY: number,
  options: { roundToIntegers?: boolean; precision?: number } = {}
): Command[] {
  const { roundToIntegers = false, precision = PATH_DECIMAL_PRECISION } = options;
  const formatter = roundToIntegers ? Math.round : (n: number) => formatToPrecision(n, precision);
  
  return mapCommandPoints(commands, (point) => ({
    x: formatter(point.x + deltaX),
    y: formatter(point.y + deltaY),
  }));
}

/**
 * Translates PathData by deltaX and deltaY with configurable formatting options.
 * This is the main path translation function - use this for all path translation operations.
 * 
 * @param pathData - PathData object to translate
 * @param deltaX - X-axis translation amount
 * @param deltaY - Y-axis translation amount
 * @param options - Optional formatting configuration
 * @param options.roundToIntegers - If true, rounds all coordinates to integers
 * @param options.precision - Number of decimal places (default: PATH_DECIMAL_PRECISION)
 * @returns Translated PathData
 */
export function translatePathData(
  pathData: PathData, 
  deltaX: number, 
  deltaY: number,
  options: { roundToIntegers?: boolean; precision?: number } = {}
): PathData {
  const translatedSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    translateCommands(subPath, deltaX, deltaY, options)
  );

  return {
    ...pathData,
    subPaths: translatedSubPaths
  };
}

/**
 * Helper type for alignment operations
 */
export type TargetCalculator = (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) => number;
export type Axis = 'x' | 'y';

/**
 * Pre-defined target calculators for common alignment operations
 */
export const alignmentTargets = {
  left: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((min, b) => Math.min(min, b.minX), Infinity),
  center: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((sum, b) => sum + (b.minX + b.maxX) / 2, 0) / bounds.length,
  right: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((max, b) => Math.max(max, b.maxX), -Infinity),
  top: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((min, b) => Math.min(min, b.minY), Infinity),
  middle: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((sum, b) => sum + (b.minY + b.maxY) / 2, 0) / bounds.length,
  bottom: (bounds: { minX: number; minY: number; maxX: number; maxY: number }[]) =>
    bounds.reduce((max, b) => Math.max(max, b.maxY), -Infinity)
} as const;

/**
 * Scales a collection of commands relative to an origin point.
 * This now delegates to transformCommands for consistency.
 * 
 * @param commands - Commands to scale
 * @param scaleX - X-axis scale factor (1 = no change)
 * @param scaleY - Y-axis scale factor (1 = no change)
 * @param originX - X coordinate of the scaling origin (center point)
 * @param originY - Y coordinate of the scaling origin (center point)
 * @param options - Optional formatting configuration
 * @returns Scaled commands array
 */
export function scaleCommands(
  commands: Command[],
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  options: { precision?: number } = {}
): Command[] {
  const hasPrecision = options.precision !== undefined;
  const precision = options.precision ?? PATH_DECIMAL_PRECISION;
  
  // Delegate to transformCommands (unified scaling/transform logic)
  const transformed = transformCommands(commands, {
    scaleX,
    scaleY,
    originX,
    originY,
    rotation: 0, // No rotation for pure scaling
  });

  // Apply precision formatting only if explicitly specified
  if (hasPrecision) {
    const formatter = (n: number) => formatToPrecision(n, precision);
    return transformed.map(cmd => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return {
          ...cmd,
          position: {
            x: formatter(cmd.position.x),
            y: formatter(cmd.position.y),
          },
        };
      } else if (cmd.type === 'C') {
        return {
          ...cmd,
          controlPoint1: {
            ...cmd.controlPoint1,
            x: formatter(cmd.controlPoint1.x),
            y: formatter(cmd.controlPoint1.y),
          },
          controlPoint2: {
            ...cmd.controlPoint2,
            x: formatter(cmd.controlPoint2.x),
            y: formatter(cmd.controlPoint2.y),
          },
          position: {
            x: formatter(cmd.position.x),
            y: formatter(cmd.position.y),
          },
        };
      }
      return cmd;
    });
  }

  return transformed;
}

/**
 * Scales PathData relative to a center point (origin).
 * Supports scaling on a single axis (width or height) or both axes.
 * 
 * @param pathData - PathData object to scale
 * @param scaleX - X-axis scale factor (1 = no change)
 * @param scaleY - Y-axis scale factor (1 = no change)
 * @param originX - X coordinate of the scaling origin (center point)
 * @param originY - Y coordinate of the scaling origin (center point)
 * @param options - Optional formatting configuration
 * @returns Scaled PathData
 */
export function scalePathData(
  pathData: PathData,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  options: { precision?: number } = {}
): PathData {
  const scaledSubPaths = pathData.subPaths.map((subPath: Command[]) =>
    scaleCommands(subPath, scaleX, scaleY, originX, originY, options)
  );

  return {
    ...pathData,
    subPaths: scaledSubPaths
  };
}

/**
 * Note: Legacy transformPathData function removed.
 * Use transformCommands from sharedTransformUtils for all transformations.
 */
