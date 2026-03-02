import type { CanvasElement, Command, SubPath } from '../types';
import { mapCommandPoints } from './commandPointMapper';
import { getAccumulatedTransformMatrix } from './elementTransformUtils';
import { applyToPoint, isIdentityMatrix, type Matrix } from './matrixUtils';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

const transformSubPath = (subPath: SubPath, matrix: Matrix): SubPath =>
  mapCommandPoints(subPath as Command[], (point) => applyToPoint(matrix, point)) as SubPath;

/**
 * Returns path subpaths in world coordinates (including the element's own
 * transform and all ancestor group transforms).
 */
export const getPathSubPathsInWorld = (
  element: CanvasElement,
  elements: ElementsSource,
): SubPath[] => {
  if (element.type !== 'path') return [];
  const subPaths = (element.data as { subPaths?: SubPath[] }).subPaths ?? [];
  const matrix = getAccumulatedTransformMatrix(element.id, elements);
  if (isIdentityMatrix(matrix)) return subPaths;
  return subPaths.map((subPath) => transformSubPath(subPath, matrix));
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const EPSILON = 1e-9;

const includePoint = (bounds: Bounds, x: number, y: number): void => {
  if (x < bounds.minX) bounds.minX = x;
  if (y < bounds.minY) bounds.minY = y;
  if (x > bounds.maxX) bounds.maxX = x;
  if (y > bounds.maxY) bounds.maxY = y;
};

const cubicAt = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
};

const getCubicExtrema = (p0: number, p1: number, p2: number, p3: number): number[] => {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;

  if (Math.abs(a) < EPSILON) {
    if (Math.abs(b) < EPSILON) return [];
    const t = -c / b;
    return t > 0 && t < 1 ? [t] : [];
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (Math.abs(discriminant) < EPSILON) {
    const t = -b / (2 * a);
    return t > 0 && t < 1 ? [t] : [];
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b + sqrtDiscriminant) / (2 * a);
  const t2 = (-b - sqrtDiscriminant) / (2 * a);

  return [t1, t2].filter((t) => t > 0 && t < 1);
};

const includeLineBounds = (
  bounds: Bounds,
  from: { x: number; y: number },
  to: { x: number; y: number }
): void => {
  includePoint(bounds, from.x, from.y);
  includePoint(bounds, to.x, to.y);
};

const includeCubicBounds = (
  bounds: Bounds,
  from: { x: number; y: number },
  command: Extract<Command, { type: 'C' }>
): void => {
  includePoint(bounds, from.x, from.y);
  includePoint(bounds, command.position.x, command.position.y);

  const ts = new Set<number>([
    ...getCubicExtrema(from.x, command.controlPoint1.x, command.controlPoint2.x, command.position.x),
    ...getCubicExtrema(from.y, command.controlPoint1.y, command.controlPoint2.y, command.position.y),
  ]);

  ts.forEach((t) => {
    includePoint(
      bounds,
      cubicAt(from.x, command.controlPoint1.x, command.controlPoint2.x, command.position.x, t),
      cubicAt(from.y, command.controlPoint1.y, command.controlPoint2.y, command.position.y, t)
    );
  });
};

/**
 * Computes an axis-aligned bounding box for subpaths, including cubic control
 * points so overlays match visual editing helpers.
 */
export const getSubPathsBounds = (subPaths: SubPath[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasPoints = false;

  subPaths.forEach((subPath) => {
    subPath.forEach((cmd) => {
      if (cmd.type === 'Z') return;
      hasPoints = true;

      const p = cmd.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;

      if (cmd.type === 'C') {
        const cp1 = cmd.controlPoint1;
        const cp2 = cmd.controlPoint2;
        if (cp1.x < minX) minX = cp1.x;
        if (cp1.y < minY) minY = cp1.y;
        if (cp1.x > maxX) maxX = cp1.x;
        if (cp1.y > maxY) maxY = cp1.y;
        if (cp2.x < minX) minX = cp2.x;
        if (cp2.y < minY) minY = cp2.y;
        if (cp2.x > maxX) maxX = cp2.x;
        if (cp2.y > maxY) maxY = cp2.y;
      }
    });
  });

  if (!hasPoints) return null;
  return { minX, minY, maxX, maxY };
};

/**
 * Computes an axis-aligned bounding box for the actual geometry traced by the
 * path, excluding off-curve control points from cubic bezier bounds.
 */
export const getSubPathsTightBounds = (subPaths: SubPath[]) => {
  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  let hasPoints = false;

  subPaths.forEach((subPath) => {
    let currentPoint: { x: number; y: number } | null = null;
    let subPathStart: { x: number; y: number } | null = null;

    subPath.forEach((cmd) => {
      switch (cmd.type) {
        case 'M':
          includePoint(bounds, cmd.position.x, cmd.position.y);
          currentPoint = cmd.position;
          subPathStart = cmd.position;
          hasPoints = true;
          break;
        case 'L':
          if (currentPoint) {
            includeLineBounds(bounds, currentPoint, cmd.position);
          } else {
            includePoint(bounds, cmd.position.x, cmd.position.y);
          }
          currentPoint = cmd.position;
          hasPoints = true;
          break;
        case 'C':
          if (currentPoint) {
            includeCubicBounds(bounds, currentPoint, cmd);
          } else {
            includePoint(bounds, cmd.position.x, cmd.position.y);
          }
          currentPoint = cmd.position;
          hasPoints = true;
          break;
        case 'Z':
          if (currentPoint && subPathStart) {
            includeLineBounds(bounds, currentPoint, subPathStart);
            currentPoint = subPathStart;
          }
          break;
      }
    });
  });

  if (!hasPoints) return null;
  return bounds;
};
