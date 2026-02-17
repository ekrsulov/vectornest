import type { CanvasElement } from '../../../../types';
import {
  collectSelectedElementBounds,
  getTopLevelSelectedElements,
} from '../../../../utils/arrangementUtils';
import { scaleTopLevelElement } from './arrangeElementOperations';
import type { MatchSizeDimension, MatchSizeMode } from './arrangeAlgorithmTypes';

export const matchSizeToTarget = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  dimension: MatchSizeDimension,
  mode: MatchSizeMode
): CanvasElement[] => {
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);
  if (elementBounds.length < 2) {
    return elements;
  }

  const sizes = elementBounds.map((item) => (dimension === 'width' ? item.width : item.height));
  let targetSize = sizes[0];
  for (let i = 1; i < sizes.length; i++) {
    targetSize = mode === 'largest'
      ? (sizes[i] > targetSize ? sizes[i] : targetSize)
      : (sizes[i] < targetSize ? sizes[i] : targetSize);
  }
  const topLevelSet = new Set(getTopLevelSelectedElements(elements, selectedIds));
  let updatedElements = elements;

  elementBounds.forEach((item) => {
    if (!topLevelSet.has(item.element.id)) {
      return;
    }

    const currentSize = dimension === 'width' ? item.width : item.height;
    if (currentSize === 0) {
      return;
    }

    const scaleFactor = targetSize / currentSize;
    if (Math.abs(scaleFactor - 1) < 0.0001) {
      return;
    }

    const centerX = (item.bounds.minX + item.bounds.maxX) / 2;
    const centerY = (item.bounds.minY + item.bounds.maxY) / 2;
    const scaleX = dimension === 'width' ? scaleFactor : 1;
    const scaleY = dimension === 'height' ? scaleFactor : 1;

    updatedElements = scaleTopLevelElement(
      updatedElements,
      item.element,
      scaleX,
      scaleY,
      centerX,
      centerY
    );
  });

  return updatedElements;
};
