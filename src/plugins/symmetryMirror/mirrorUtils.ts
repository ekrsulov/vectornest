import type { Point, SubPath, Command, PathData, ControlPoint } from '../../types';
import type { SymmetryMode } from '../symmetryDraw/slice';

/**
 * Reflect a point across the vertical axis (x = centerX).
 */
function reflectX(p: Point, cx: number): Point {
  return { x: 2 * cx - p.x, y: p.y };
}

/**
 * Reflect a point across the horizontal axis (y = centerY).
 */
function reflectY(p: Point, cy: number): Point {
  return { x: p.x, y: 2 * cy - p.y };
}

/**
 * Rotate a point around a center by an angle in radians.
 */
function rotatePoint(p: Point, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

type PointTransform = (p: Point) => Point;

/**
 * Apply a point transform to a ControlPoint, preserving all metadata.
 */
function transformControlPoint(cp: ControlPoint, fn: PointTransform): ControlPoint {
  const transformed = fn(cp);
  return {
    ...cp,
    x: transformed.x,
    y: transformed.y,
    anchor: fn(cp.anchor),
  };
}

/**
 * Apply a point transform to all points in a SubPath array.
 */
export function transformSubPaths(subPaths: SubPath[], fn: PointTransform): SubPath[] {
  return subPaths.map((sp) =>
    sp.map((cmd): Command => {
      switch (cmd.type) {
        case 'M':
        case 'L':
          return { type: cmd.type, position: fn(cmd.position) };
        case 'C':
          return {
            type: 'C',
            controlPoint1: transformControlPoint(cmd.controlPoint1, fn),
            controlPoint2: transformControlPoint(cmd.controlPoint2, fn),
            position: fn(cmd.position),
          };
        case 'Z':
          return { type: 'Z' };
      }
    })
  );
}

/**
 * Generate all the mirror transforms for a given symmetry mode.
 * Returns an array of transform functions (excluding the identity).
 */
export function getMirrorTransforms(
  mode: SymmetryMode,
  centerX: number,
  centerY: number,
  segments: number
): PointTransform[] {
  const transforms: PointTransform[] = [];

  switch (mode) {
    case 'mirror-x':
      transforms.push((p) => reflectX(p, centerX));
      break;

    case 'mirror-y':
      transforms.push((p) => reflectY(p, centerY));
      break;

    case 'mirror-xy':
      transforms.push((p) => reflectX(p, centerX));
      transforms.push((p) => reflectY(p, centerY));
      transforms.push((p) => reflectX(reflectY(p, centerY), centerX));
      break;

    case 'radial':
      for (let i = 1; i < segments; i++) {
        const angle = (i * 2 * Math.PI) / segments;
        transforms.push((p) => rotatePoint(p, centerX, centerY, angle));
      }
      break;
  }

  return transforms;
}

/**
 * Create mirrored copies of path data.
 * Returns an array of new PathData objects (one per mirror transform).
 */
export function createMirroredPaths(
  sourceData: PathData,
  mode: SymmetryMode,
  centerX: number,
  centerY: number,
  segments: number
): PathData[] {
  const transforms = getMirrorTransforms(mode, centerX, centerY, segments);

  return transforms.map((fn) => ({
    ...sourceData,
    subPaths: transformSubPaths(sourceData.subPaths, fn),
  }));
}
