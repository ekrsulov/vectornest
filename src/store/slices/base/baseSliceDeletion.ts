import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { runCleanupHooks } from '../../cleanupHookRegistry';
import { buildElementMap } from '../../../utils';
import { safeChildIdsFromElement, collectGroupDescendants } from '../../../utils/groupTraversalUtils';

interface GroupCollapseInfo {
  groupId: string;
  singleChildId: string;
  grandParentId: string | null;
}

const collectGroupDescendantIds = (
  rootIds: string[],
  elementMap: Map<string, CanvasElement>,
  idsToDelete: Set<string>
): void => {
  rootIds.forEach((rootId) => {
    const descendants = collectGroupDescendants(rootId, elementMap);
    descendants.forEach((id) => idsToDelete.add(id));
  });
};

const collectSingleChildGroupCollapses = (
  rootIds: string[],
  elementMap: Map<string, CanvasElement>,
  idsToDelete: Set<string>
): GroupCollapseInfo[] => {
  const collapses: GroupCollapseInfo[] = [];
  const handledParentIds = new Set<string>();

  rootIds.forEach((rootId) => {
    const element = elementMap.get(rootId);
    if (!element || element.type === 'group' || !element.parentId) {
      return;
    }

    const parentId = element.parentId;
    if (handledParentIds.has(parentId) || idsToDelete.has(parentId)) {
      return;
    }

    const parentElement = elementMap.get(parentId);
    if (parentElement?.type !== 'group') {
      return;
    }

    const remainingChildIds = safeChildIdsFromElement(parentElement).filter((childId) => !idsToDelete.has(childId));
    if (remainingChildIds.length !== 1) {
      return;
    }

    collapses.push({
      groupId: parentElement.id,
      singleChildId: remainingChildIds[0],
      grandParentId: parentElement.parentId,
    });
    handledParentIds.add(parentElement.id);
  });

  return collapses;
};

const hasChildIdsChanged = (previous: string[], next: string[]): boolean => {
  if (previous.length !== next.length) {
    return true;
  }
  return next.some((childId, index) => childId !== previous[index]);
};

const applyDeletionToElements = (
  elements: CanvasElement[],
  idsToDelete: Set<string>,
  collapses: GroupCollapseInfo[]
): CanvasElement[] => {
  const collapseByGroupId = new Map<string, GroupCollapseInfo>();
  const reparentByChildId = new Map<string, string | null>();
  collapses.forEach((collapseInfo) => {
    collapseByGroupId.set(collapseInfo.groupId, collapseInfo);
    reparentByChildId.set(collapseInfo.singleChildId, collapseInfo.grandParentId);
  });

  const updatedElements: CanvasElement[] = [];
  elements.forEach((element) => {
    if (idsToDelete.has(element.id)) {
      return;
    }

    let updatedElement: CanvasElement = element;

    const nextParentId = reparentByChildId.get(element.id);
    if (nextParentId !== undefined && element.parentId !== nextParentId) {
      updatedElement = {
        ...updatedElement,
        parentId: nextParentId,
      };
    }

    if (element.type === 'group') {
      const existingChildIds = safeChildIdsFromElement(element);
      const nextChildIds = existingChildIds.flatMap((childId) => {
        const collapseInfo = collapseByGroupId.get(childId);
        if (collapseInfo) {
          return idsToDelete.has(collapseInfo.singleChildId) ? [] : [collapseInfo.singleChildId];
        }
        return idsToDelete.has(childId) ? [] : [childId];
      });

      if (hasChildIdsChanged(existingChildIds, nextChildIds)) {
        updatedElement = {
          ...updatedElement,
          data: {
            ...updatedElement.data,
            childIds: nextChildIds,
          },
        } as CanvasElement;
      }
    }

    updatedElements.push(updatedElement);
  });

  return updatedElements;
};

export const deleteElementsBatch = (
  state: CanvasStore,
  rootIds: string[],
  options: { clearSelection: boolean }
): Partial<CanvasStore> => {
  const elementMap = buildElementMap(state.elements);
  const idsToDelete = new Set<string>(rootIds);

  collectGroupDescendantIds(rootIds, elementMap, idsToDelete);
  const collapses = collectSingleChildGroupCollapses(rootIds, elementMap, idsToDelete);
  collapses.forEach((collapseInfo) => {
    idsToDelete.add(collapseInfo.groupId);
  });

  const updatedElements = applyDeletionToElements(state.elements, idsToDelete, collapses);
  const cleanupResults = runCleanupHooks(Array.from(idsToDelete), updatedElements, state);

  if (options.clearSelection) {
    return { elements: updatedElements, selectedIds: [], ...cleanupResults };
  }
  return { elements: updatedElements, ...cleanupResults };
};
