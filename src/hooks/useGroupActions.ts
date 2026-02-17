import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { buildElementMap } from '../utils';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import {
  buildElementContextActions,
  buildGroupContextActions,
  buildMultiSelectionActions,
} from './groupActions/groupActionContextBuilders';
import {
  findTopMostGroupForElementInMap,
  hasGroupsInSelectionFromMap,
  hasHiddenElementsInState,
  hasLockedElementsInState,
  isGroupHiddenInMap,
  isGroupLockedInMap,
  processContextSelectedElements,
} from './groupActions/groupActionHelpers';
import type { GroupActionHelpers, GroupActionStoreSlice } from './groupActions/groupActionTypes';

/**
 * Hook that provides group-related actions for the floating context menu.
 * Handles grouping, ungrouping, visibility, and locking.
 */
export function useGroupActions(context: SelectionContextInfo | null): {
  actions: FloatingContextMenuAction[];
  helpers: GroupActionHelpers;
} {
  const {
    elements,
    selectedIds,
    hiddenElementIds,
    lockedElementIds,
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
    useShallow((state): GroupActionStoreSlice => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      hiddenElementIds: state.hiddenElementIds,
      lockedElementIds: state.lockedElementIds,
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

  const elementMap = useMemo(() => buildElementMap(elements), [elements]);

  const hasHiddenElements = useCallback(
    () => hasHiddenElementsInState(hiddenElementIds, elements),
    [hiddenElementIds, elements]
  );

  const hasLockedElements = useCallback(
    () => hasLockedElementsInState(lockedElementIds, elements),
    [lockedElementIds, elements]
  );

  const isElementHidden = useCallback((id: string) => checkElementHidden?.(id) ?? false, [checkElementHidden]);
  const isElementLocked = useCallback((id: string) => checkElementLocked?.(id) ?? false, [checkElementLocked]);

  const isGroupHidden = useCallback(
    (groupId: string) => isGroupHiddenInMap(elementMap, groupId),
    [elementMap]
  );

  const isGroupLocked = useCallback(
    (groupId: string) => isGroupLockedInMap(elementMap, groupId),
    [elementMap]
  );

  const hasGroupsInSelection = useCallback(
    (ids: string[]) => hasGroupsInSelectionFromMap(elementMap, ids),
    [elementMap]
  );

  const findTopMostGroupForElement = useCallback(
    (elementId: string) => findTopMostGroupForElementInMap(elementMap, elementId),
    [elementMap]
  );

  const processSelectedElements = useCallback(
    (action: (id: string, type: 'group' | 'element') => void) => {
      processContextSelectedElements(context, elementMap, findTopMostGroupForElement, action);
    },
    [context, elementMap, findTopMostGroupForElement]
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
          selectedIds,
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
          isGroupHidden,
          isGroupLocked,
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
          selectedIds,
          isElementHidden,
          isElementLocked,
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
    isElementHidden,
    isElementLocked,
    isGroupHidden,
    isGroupLocked,
    selectedIds,
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
      hasGroupsInSelection,
      findTopMostGroupForElement,
    }),
    [
      findTopMostGroupForElement,
      hasGroupsInSelection,
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
