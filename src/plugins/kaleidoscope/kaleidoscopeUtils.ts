import type { Point, SubPath, Command, ControlPoint, PathData } from '../../types';

type PointTransform = (p: Point) => Point;

function rotatePoint(p: Point, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function reflectAcrossLine(p: Point, cx: number, cy: number, lineAngle: number): Point {
  // Reflect point across a line through (cx,cy) at the given angle
  const dx = p.x - cx;
  const dy = p.y - cy;
  const cos2 = Math.cos(2 * lineAngle);
  const sin2 = Math.sin(2 * lineAngle);
  return {
    x: cx + dx * cos2 + dy * sin2,
    y: cy + dx * sin2 - dy * cos2,
  };
}

function transformCP(cp: ControlPoint, fn: PointTransform): ControlPoint {
  const t = fn(cp);
  return { ...cp, x: t.x, y: t.y, anchor: fn(cp.anchor) };
}

function transformSubPaths(subPaths: SubPath[], fn: PointTransform): SubPath[] {
  return subPaths.map((sp) =>
    sp.map((cmd): Command => {
      switch (cmd.type) {
        case 'M':
        case 'L':
          return { type: cmd.type, position: fn(cmd.position) };
        case 'C':
          return {
            type: 'C',
            controlPoint1: transformCP(cmd.controlPoint1, fn),
            controlPoint2: transformCP(cmd.controlPoint2, fn),
            position: fn(cmd.position),
          };
        case 'Z':
          return { type: 'Z' };
      }
    })
  );
}

/**
 * Generate all kaleidoscope transforms for the given configuration.
 * Each segment gets a rotation, and optionally a reflection + rotation.
 */
export function getKaleidoscopeTransforms(
  segments: number,
  cx: number,
  cy: number,
  offsetDeg: number,
  reflect: boolean
): PointTransform[] {
  const transforms: PointTransform[] = [];
  const offsetRad = (offsetDeg * Math.PI) / 180;
  const sliceAngle = (2 * Math.PI) / segments;

  for (let i = 1; i < segments; i++) {
    const angle = i * sliceAngle + offsetRad;
    // Rotation copy
    transforms.push((p) => rotatePoint(p, cx, cy, angle));
  }

  if (reflect) {
    // For each segment, also add a reflected copy
    for (let i = 0; i < segments; i++) {
      const lineAngle = i * sliceAngle + offsetRad;
      transforms.push((p) => reflectAcrossLine(p, cx, cy, lineAngle));
    }
  }

  return transforms;
}

/**
 * Apply kaleidoscope to a set of source paths.
 * Returns an array of new PathData objects for each transformed copy.
 */
export function applyKaleidoscope(
  sourcePaths: PathData[],
  segments: number,
  cx: number,
  cy: number,
  offsetDeg: number,
  reflect: boolean
): PathData[] {
  const transforms = getKaleidoscopeTransforms(segments, cx, cy, offsetDeg, reflect);
  const results: PathData[] = [];

  for (const srcData of sourcePaths) {
    for (const fn of transforms) {
      results.push({
        ...srcData,
        subPaths: transformSubPaths(srcData.subPaths, fn),
        isPencilPath: false,
      });
    }
  }

  return results;
}
