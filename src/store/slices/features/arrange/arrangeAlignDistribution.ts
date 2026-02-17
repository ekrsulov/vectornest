import type { CanvasElement } from '../../../../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../../utils';
import {
  collectSelectedElementBounds,
  getTopLevelSelectedElements,
} from '../../../../utils/arrangementUtils';
import type { Axis, TargetCalculator } from '../../../../utils/transformationUtils';
import { translateTopLevelElement } from './arrangeElementOperations';

export const alignElements = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  targetCalculator: TargetCalculator,
  axis: Axis
): CanvasElement[] => {
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);
  if (elementBounds.length < 2) {
    return elements;
  }

  const targetValue = targetCalculator(elementBounds.map((item) => item.bounds));
  const topLevelSet = new Set(getTopLevelSelectedElements(elements, selectedIds));
  let updatedElements = elements;

  elementBounds.forEach((item) => {
    if (!topLevelSet.has(item.element.id)) {
      return;
    }

    const currentValue = targetCalculator([item.bounds]);
    const deltaX = axis === 'x'
      ? formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION)
      : 0;
    const deltaY = axis === 'y'
      ? formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION)
      : 0;
    if (Number.isNaN(deltaX) || Number.isNaN(deltaY)) {
      return;
    }

    updatedElements = translateTopLevelElement(updatedElements, item.element, deltaX, deltaY);
  });

  return updatedElements;
};

export const distributeElements = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  axis: Axis
): CanvasElement[] => {
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);
  if (elementBounds.length < 3) {
    return elements;
  }

  elementBounds.sort((a, b) => (
    axis === 'x' ? a.centerX - b.centerX : a.centerY - b.centerY
  ));

  const leftmost = elementBounds[0].bounds.minX;
  const rightmost = elementBounds[elementBounds.length - 1].bounds.maxX;
  const topmost = elementBounds[0].bounds.minY;
  const bottommost = elementBounds[elementBounds.length - 1].bounds.maxY;
  const totalWidth = rightmost - leftmost;
  const totalHeight = bottommost - topmost;
  const totalElementsWidth = elementBounds.reduce((sum, item) => sum + item.width, 0);
  const totalElementsHeight = elementBounds.reduce((sum, item) => sum + item.height, 0);
  const availableSpace = axis === 'x'
    ? totalWidth - totalElementsWidth
    : totalHeight - totalElementsHeight;
  const spaceBetween = availableSpace / (elementBounds.length - 1);

  const positions: number[] = [];
  let currentPos = axis === 'x' ? leftmost : topmost;
  for (let index = 0; index < elementBounds.length; index += 1) {
    positions.push(currentPos);
    const size = axis === 'x' ? elementBounds[index].width : elementBounds[index].height;
    currentPos += size + spaceBetween;
  }

  const topLevelSet = new Set(getTopLevelSelectedElements(elements, selectedIds));
  let updatedElements = elements;

  elementBounds.forEach((item, index) => {
    if (!topLevelSet.has(item.element.id)) {
      return;
    }

    const targetPos = positions[index];
    const currentPosByAxis = axis === 'x' ? item.bounds.minX : item.bounds.minY;
    const delta = formatToPrecision(targetPos - currentPosByAxis, PATH_DECIMAL_PRECISION);
    if (Number.isNaN(delta)) {
      return;
    }

    const deltaX = axis === 'x' ? delta : 0;
    const deltaY = axis === 'y' ? delta : 0;
    updatedElements = translateTopLevelElement(updatedElements, item.element, deltaX, deltaY);
  });

  return updatedElements;
};
