import type { CanvasElement } from '../../types';
import type { SelectionContextInfo } from '../../types/selection';

export const hasHiddenElementsInState = (
  hiddenElementIds: string[] | undefined,
  elements: CanvasElement[]
): boolean => {
  if ((hiddenElementIds?.length ?? 0) > 0) {
    return true;
  }
  return elements.some((element) => element.type === 'group' && element.data.isHidden);
};

export const hasLockedElementsInState = (
  lockedElementIds: string[] | undefined,
  elements: CanvasElement[]
): boolean => {
  if ((lockedElementIds?.length ?? 0) > 0) {
    return true;
  }
  return elements.some((element) => element.type === 'group' && element.data.isLocked);
};

export const isGroupHiddenInMap = (
  elementMap: Map<string, CanvasElement>,
  groupId: string
): boolean => {
  const group = elementMap.get(groupId);
  if (!group || group.type !== 'group') {
    return false;
  }
  return group.data.isHidden ?? false;
};

export const isGroupLockedInMap = (
  elementMap: Map<string, CanvasElement>,
  groupId: string
): boolean => {
  const group = elementMap.get(groupId);
  if (!group || group.type !== 'group') {
    return false;
  }
  return group.data.isLocked ?? false;
};

export const hasGroupsInSelectionFromMap = (
  elementMap: Map<string, CanvasElement>,
  ids: string[]
): boolean => ids.some((id) => elementMap.get(id)?.type === 'group');

export const findTopMostGroupForElementInMap = (
  elementMap: Map<string, CanvasElement>,
  elementId: string
): string => {
  const element = elementMap.get(elementId);
  if (!element || !element.parentId) {
    return elementId;
  }

  let topMostId = elementId;
  let currentParentId: string | null | undefined = element.parentId;

  while (currentParentId) {
    const parent = elementMap.get(currentParentId);
    if (!parent) {
      break;
    }
    topMostId = parent.id;
    currentParentId = parent.parentId;
  }

  return topMostId;
};

export const processContextSelectedElements = (
  context: SelectionContextInfo | null,
  elementMap: Map<string, CanvasElement>,
  findTopMostGroupForElement: (elementId: string) => string,
  action: (id: string, type: 'group' | 'element') => void
): void => {
  if (!context || context.type !== 'multiselection' || !context.elementIds) {
    return;
  }

  const processedIds = new Set<string>();
  context.elementIds.forEach((id) => {
    const topMostId = findTopMostGroupForElement(id);
    if (processedIds.has(topMostId)) {
      return;
    }
    processedIds.add(topMostId);

    const element = elementMap.get(topMostId);
    if (!element) {
      return;
    }
    action(topMostId, element.type === 'group' ? 'group' : 'element');
  });
};
