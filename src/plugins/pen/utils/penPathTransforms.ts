import type { CanvasElement, Point } from '../../../types';
import type { PenPath } from '../types';
import { getAccumulatedTransformMatrix } from '../../../utils/elementTransformUtils';
import { applyToPoint, inverseMatrix, type Matrix } from '../../../utils/matrixUtils';

const transformHandle = (
  anchorPosition: Point,
  handle: Point | undefined,
  matrix: Matrix,
  transformedAnchorPosition: Point
): Point | undefined => {
  if (!handle) return undefined;

  const handleAbsolute = {
    x: anchorPosition.x + handle.x,
    y: anchorPosition.y + handle.y,
  };
  const transformedHandleAbsolute = applyToPoint(matrix, handleAbsolute);

  return {
    x: transformedHandleAbsolute.x - transformedAnchorPosition.x,
    y: transformedHandleAbsolute.y - transformedAnchorPosition.y,
  };
};

export function transformPenPath(path: PenPath, matrix: Matrix): PenPath {
  const anchors = path.anchors.map((anchor) => {
    const transformedPosition = applyToPoint(matrix, anchor.position);

    return {
      ...anchor,
      position: transformedPosition,
      inHandle: transformHandle(anchor.position, anchor.inHandle, matrix, transformedPosition),
      outHandle: transformHandle(anchor.position, anchor.outHandle, matrix, transformedPosition),
    };
  });

  return {
    ...path,
    anchors,
  };
}

export function toWorldPenPath(path: PenPath, elementId: string, elements: CanvasElement[]): PenPath {
  const matrix = getAccumulatedTransformMatrix(elementId, elements);
  return transformPenPath(path, matrix);
}

export function toLocalPenPath(path: PenPath, elementId: string, elements: CanvasElement[]): PenPath {
  const matrix = getAccumulatedTransformMatrix(elementId, elements);
  const inverse = inverseMatrix(matrix);

  if (!inverse) {
    return path;
  }

  return transformPenPath(path, inverse);
}

export function toLocalPointForElement(point: Point, elementId: string, elements: CanvasElement[]): Point {
  const matrix = getAccumulatedTransformMatrix(elementId, elements);
  const inverse = inverseMatrix(matrix);

  if (!inverse) {
    return point;
  }

  return applyToPoint(inverse, point);
}
