import type { CanvasElement, PathData } from '../../../../types';
import { buildElementMap, PATH_DECIMAL_PRECISION } from '../../../../utils';
import { elementContributionRegistry } from '../../../../utils/elementContributionRegistry';
import { scalePathData, translatePathData } from '../../../../utils/transformationUtils';
import { collectGroupDescendants } from '../../../../utils/groupTraversalUtils';

const collectGroupDescendantSet = (
  elements: CanvasElement[],
  groupId: string,
  prebuiltMap?: Map<string, CanvasElement>
): Set<string> | null => {
  const elementMap = prebuiltMap ?? buildElementMap(elements);
  const descendants = collectGroupDescendants(groupId, elementMap);
  return descendants.length > 0 ? new Set(descendants) : null;
};

const translateElementWithFallback = (
  element: CanvasElement,
  deltaX: number,
  deltaY: number
): CanvasElement => {
  const translated = elementContributionRegistry.translateElement(
    element,
    deltaX,
    deltaY,
    PATH_DECIMAL_PRECISION
  );
  if (translated) {
    return translated;
  }

  if (element.type === 'path') {
    return { ...element, data: translatePathData(element.data as PathData, deltaX, deltaY) };
  }

  return element;
};

const scaleElementWithFallback = (
  element: CanvasElement,
  scaleX: number,
  scaleY: number,
  centerX: number,
  centerY: number
): CanvasElement => {
  const scaled = elementContributionRegistry.scaleElement(
    element,
    scaleX,
    scaleY,
    centerX,
    centerY,
    PATH_DECIMAL_PRECISION
  );
  if (scaled) {
    return scaled;
  }

  if (element.type === 'path') {
    return { ...element, data: scalePathData(element.data as PathData, scaleX, scaleY, centerX, centerY) };
  }

  return element;
};

const translateGroupDescendants = (
  elements: CanvasElement[],
  groupId: string,
  deltaX: number,
  deltaY: number
): CanvasElement[] => {
  const descendants = collectGroupDescendantSet(elements, groupId);
  if (!descendants) {
    return elements;
  }

  return elements.map((element) => {
    if (!descendants.has(element.id) || element.type === 'group') {
      return element;
    }

    return translateElementWithFallback(element, deltaX, deltaY);
  });
};

const scaleGroupDescendants = (
  elements: CanvasElement[],
  groupId: string,
  scaleX: number,
  scaleY: number,
  centerX: number,
  centerY: number
): CanvasElement[] => {
  const descendants = collectGroupDescendantSet(elements, groupId);
  if (!descendants) {
    return elements;
  }

  return elements.map((element) => {
    if (!descendants.has(element.id) || element.type === 'group') {
      return element;
    }

    return scaleElementWithFallback(element, scaleX, scaleY, centerX, centerY);
  });
};

export const translateTopLevelElement = (
  elements: CanvasElement[],
  topLevelElement: CanvasElement,
  deltaX: number,
  deltaY: number
): CanvasElement[] => {
  if (topLevelElement.type === 'group') {
    return translateGroupDescendants(elements, topLevelElement.id, deltaX, deltaY);
  }

  return elements.map((element) => {
    if (element.id !== topLevelElement.id || element.type === 'group') {
      return element;
    }

    return translateElementWithFallback(element, deltaX, deltaY);
  });
};

export const scaleTopLevelElement = (
  elements: CanvasElement[],
  topLevelElement: CanvasElement,
  scaleX: number,
  scaleY: number,
  centerX: number,
  centerY: number
): CanvasElement[] => {
  if (topLevelElement.type === 'group') {
    return scaleGroupDescendants(
      elements,
      topLevelElement.id,
      scaleX,
      scaleY,
      centerX,
      centerY
    );
  }

  return elements.map((element) => {
    if (element.id !== topLevelElement.id || element.type === 'group') {
      return element;
    }

    return scaleElementWithFallback(element, scaleX, scaleY, centerX, centerY);
  });
};
