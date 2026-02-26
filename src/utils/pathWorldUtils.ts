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
