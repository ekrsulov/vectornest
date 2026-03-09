import type { CanvasElement, GroupElement } from '../../types';
import {
  IDENTITY_MATRIX,
  createTranslateMatrix,
  multiplyMatrices,
} from '../../utils/matrixUtils';
import { transformDeltaToElementLocal } from '../../utils/elementTransformUtils';
import type { AnimationTransformDelta } from './movementTypes';

const DEFAULT_GROUP_TRANSFORM = {
  translateX: 0,
  translateY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

export const resolveLocalDelta = (
  deltaX: number,
  deltaY: number,
  element: CanvasElement,
  elements: CanvasElement[]
): { x: number; y: number } => {
  return transformDeltaToElementLocal({ x: deltaX, y: deltaY }, element, elements);
};

export const moveGroupByLocalDelta = (
  group: GroupElement,
  localDelta: { x: number; y: number }
): GroupElement => {
  if (group.data.transformMatrix) {
    return {
      ...group,
      data: {
        ...group.data,
        transformMatrix: multiplyMatrices(
          createTranslateMatrix(localDelta.x, localDelta.y),
          group.data.transformMatrix
        ),
      },
    };
  }

  const nextTransform = {
    ...(group.data.transform ?? DEFAULT_GROUP_TRANSFORM),
  };
  nextTransform.translateX += localDelta.x;
  nextTransform.translateY += localDelta.y;

  return {
    ...group,
    data: {
      ...group.data,
      transform: nextTransform,
    },
  };
};

export const applyAnimationDelta = (
  applyDelta: AnimationTransformDelta | undefined,
  movedElementIds: Set<string>,
  deltaX: number,
  deltaY: number
): void => {
  if (!applyDelta || movedElementIds.size === 0) {
    return;
  }

  const translateMatrix = createTranslateMatrix(deltaX, deltaY);
  const deltaEntries = Array.from(movedElementIds).map((elementId) => ({
    elementId,
    from: IDENTITY_MATRIX,
    to: translateMatrix,
  }));
  applyDelta(deltaEntries);
};
