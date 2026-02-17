import type { CanvasElement } from '../types';
import type { Matrix } from './matrixUtils';
import { IDENTITY_MATRIX, inverseMatrix, multiplyMatrices } from './matrixUtils';
import { getAccumulatedTransformMatrix, getParentCumulativeTransformMatrix } from './elementTransformUtils';

export interface TransformDeltaEntry {
  elementId: string;
  from: Matrix;
  to: Matrix;
}

/**
 * Compute transform deltas for a set of element IDs given before/after element trees.
 */
export function computeTransformDeltas(
  elementIds: Iterable<string>,
  beforeElements: CanvasElement[],
  afterElements: CanvasElement[]
): TransformDeltaEntry[] {
  const beforeMap = new Map<string, Matrix>();
  const afterMap = new Map<string, Matrix>();

  const beforeElementMap = new Map(beforeElements.map((el) => [el.id, el]));
  const afterElementMap = new Map(afterElements.map((el) => [el.id, el]));

  for (const id of elementIds) {
    const beforeGlobal = getAccumulatedTransformMatrix(id, beforeElements);
    const afterGlobal = getAccumulatedTransformMatrix(id, afterElements);

    const beforeElement = beforeElementMap.get(id);
    const afterElement = afterElementMap.get(id);

    const beforeParent = beforeElement
      ? getParentCumulativeTransformMatrix(beforeElement, beforeElements)
      : IDENTITY_MATRIX;
    const afterParent = afterElement
      ? getParentCumulativeTransformMatrix(afterElement, afterElements)
      : IDENTITY_MATRIX;

    const invBeforeParent = inverseMatrix(beforeParent) ?? IDENTITY_MATRIX;
    const invAfterParent = inverseMatrix(afterParent) ?? IDENTITY_MATRIX;

    // Normalize to element-local space so deltas don't drag animation centers with parent translations/scales.
    const beforeLocal = multiplyMatrices(invBeforeParent, beforeGlobal);
    const afterLocal = multiplyMatrices(invAfterParent, afterGlobal);

    beforeMap.set(id, beforeLocal);
    afterMap.set(id, afterLocal);
  }

  const entries: TransformDeltaEntry[] = [];
  for (const [elementId, from] of beforeMap.entries()) {
    const to = afterMap.get(elementId);
    if (to) {
      entries.push({ elementId, from, to });
    }
  }

  return entries;
}
