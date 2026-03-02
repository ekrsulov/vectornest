import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { buildElementMap } from '../utils/elementMapUtils';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import {
  buildElementContextActions,
  buildGroupContextActions,
  buildMultiSelectionActions,
} from './groupActions/groupActionContextBuilders';
import {
  findTopMostGroupForElementInMap,
  isGroupHiddenInMap,
  isGroupLockedInMap,
  processContextSelectedElements,
} from './groupActions/groupActionHelpers';
import type { GroupActionHelpers } from './groupActions/groupActionTypes';

/**
 * Hook that provides group-related actions for the floating context menu.
 * Handles grouping, ungrouping, visibility, and locking.
 */
export function useGroupActions(context: SelectionContextInfo | null): {
  actions: FloatingContextMenuAction[];
  helpers: GroupActionHelpers;
} {
  const multiselectionIds = useMemo(
    () => (context?.type === 'multiselection' ? context.elementIds ?? [] : []),
    [context]
  );
  const groupId = context?.type === 'group' ? context.groupId ?? null : null;

  const {
    selectedIdsCount,
    isElementHidden: checkElementHidden,
    isElementLocked: checkElementLocked,
    createGroupFromSelection,
    ungroupSelectedGroups,
    ungroupGroupById,
    toggleGroupVisibility,
    toggleGroupLock,
    toggleElementVisibility,
    toggleElementLock,
    showAllElements,
    unlockAllElements,
  } = useCanvasStore(
    useShallow((state) => ({
      selectedIdsCount: state.selectedIds.length,
      isElementHidden: state.isElementHidden,
      isElementLocked: state.isElementLocked,
      createGroupFromSelection: state.createGroupFromSelection,
      ungroupSelectedGroups: state.ungroupSelectedGroups,
      ungroupGroupById: state.ungroupGroupById,
      toggleGroupVisibility: state.toggleGroupVisibility,
      toggleGroupLock: state.toggleGroupLock,
      toggleElementVisibility: state.toggleElementVisibility,
      toggleElementLock: state.toggleElementLock,
      showAllElements: state.showAllElements,
      unlockAllElements: state.unlockAllElements,
    }))
  );

  const hasGroupsInSelection = useCanvasStore(
    useCallback((state) => {
      if (multiselectionIds.length === 0) {
        return false;
      }
      const selectedIdSet = new Set(multiselectionIds);
      for (const entry of state.elements) {
        if (selectedIdSet.has(entry.id) && entry.type === 'group') {
          return true;
        }
      }
      return false;
    }, [multiselectionIds])
  );

  const hasHiddenElements = useCanvasStore((state) => (
    (state.hiddenElementIds?.length ?? 0) > 0 ||
    state.elements.some((entry) => entry.type === 'group' && Boolean(entry.data.isHidden))
  ));

  const hasLockedElements = useCanvasStore((state) => (
    (state.lockedElementIds?.length ?? 0) > 0 ||
    state.elements.some((entry) => entry.type === 'group' && Boolean(entry.data.isLocked))
  ));

  const isCurrentGroupHidden = useCanvasStore(
    useCallback((state) => {
      if (!groupId) {
        return false;
      }
      const currentGroup = state.elements.find((entry) => entry.id === groupId);
      return currentGroup?.type === 'group' ? Boolean(currentGroup.data.isHidden) : false;
    }, [groupId])
  );

  const isCurrentGroupLocked = useCanvasStore(
    useCallback((state) => {
      if (!groupId) {
        return false;
      }
      const currentGroup = state.elements.find((entry) => entry.id === groupId);
      return currentGroup?.type === 'group' ? Boolean(currentGroup.data.isLocked) : false;
    }, [groupId])
  );

  const isElementHidden = useCallback(
    (id: string) => checkElementHidden?.(id) ?? false,
    [checkElementHidden]
  );
  const isElementLocked = useCallback(
    (id: string) => checkElementLocked?.(id) ?? false,
    [checkElementLocked]
  );

  const getElementMap = useCallback(() => buildElementMap(useCanvasStore.getState().elements), []);

  const isGroupHidden = useCallback(
    (targetGroupId: string) => isGroupHiddenInMap(getElementMap(), targetGroupId),
    [getElementMap]
  );

  const isGroupLocked = useCallback(
    (targetGroupId: string) => isGroupLockedInMap(getElementMap(), targetGroupId),
    [getElementMap]
  );

  const hasGroupsInSelectionHelper = useCallback((ids: string[]) => {
    const selectedIdSet = new Set(ids);
    for (const entry of useCanvasStore.getState().elements) {
      if (selectedIdSet.has(entry.id) && entry.type === 'group') {
        return true;
      }
    }
    return false;
  }, []);

  const findTopMostGroupForElement = useCallback((targetElementId: string) => {
    return findTopMostGroupForElementInMap(getElementMap(), targetElementId);
  }, [getElementMap]);

  const processSelectedElements = useCallback(
    (action: (id: string, type: 'group' | 'element') => void) => {
      const elementMap = getElementMap();
      const findTopMost = (targetElementId: string) =>
        findTopMostGroupForElementInMap(elementMap, targetElementId);
      processContextSelectedElements(context, elementMap, findTopMost, action);
    },
    [context, getElementMap]
  );

  const handleHideSelected = useCallback(() => {
    processSelectedElements((id, type) => {
      if (type === 'group') {
        toggleGroupVisibility(id);
        return;
      }
      toggleElementVisibility(id);
    });
  }, [processSelectedElements, toggleElementVisibility, toggleGroupVisibility]);

  const handleLockSelected = useCallback(() => {
    processSelectedElements((id, type) => {
      if (type === 'group') {
        toggleGroupLock(id);
        return;
      }
      toggleElementLock(id);
    });
  }, [processSelectedElements, toggleElementLock, toggleGroupLock]);

  const actions = useMemo<FloatingContextMenuAction[]>(() => {
    if (!context) {
      return [];
    }

    switch (context.type) {
      case 'multiselection':
        return buildMultiSelectionActions({
          selectedIdsCount,
          hasGroupsInSelection,
          createGroupFromSelection,
          ungroupSelectedGroups,
          handleLockSelected,
          handleHideSelected,
          hasHiddenElements,
          showAllElements,
          hasLockedElements,
          unlockAllElements,
        });

      case 'group':
        if (!context.groupId) {
          return [];
        }
        return buildGroupContextActions({
          groupId: context.groupId,
          isGroupHidden: isCurrentGroupHidden,
          isGroupLocked: isCurrentGroupLocked,
          ungroupGroupById,
          toggleGroupLock,
          toggleGroupVisibility,
        });

      case 'path':
      case 'element':
        if (!context.elementId) {
          return [];
        }
        return buildElementContextActions({
          elementId: context.elementId,
          selectedIdsCount,
          isElementHidden: isElementHidden(context.elementId),
          isElementLocked: isElementLocked(context.elementId),
          createGroupFromSelection,
          toggleElementLock,
          toggleElementVisibility,
        });

      default:
        return [];
    }
  }, [
    context,
    createGroupFromSelection,
    handleHideSelected,
    handleLockSelected,
    hasGroupsInSelection,
    hasHiddenElements,
    hasLockedElements,
    isCurrentGroupHidden,
    isCurrentGroupLocked,
    isElementHidden,
    isElementLocked,
    selectedIdsCount,
    showAllElements,
    toggleElementLock,
    toggleElementVisibility,
    toggleGroupLock,
    toggleGroupVisibility,
    ungroupGroupById,
    ungroupSelectedGroups,
    unlockAllElements,
  ]);

  const helpers = useMemo<GroupActionHelpers>(
    () => ({
      isGroupHidden,
      isGroupLocked,
      isElementHidden,
      isElementLocked,
      hasGroupsInSelection: hasGroupsInSelectionHelper,
      findTopMostGroupForElement,
    }),
    [
      findTopMostGroupForElement,
      hasGroupsInSelectionHelper,
      isElementHidden,
      isElementLocked,
      isGroupHidden,
      isGroupLocked,
    ]
  );

  return {
    actions,
    helpers,
  };
}
