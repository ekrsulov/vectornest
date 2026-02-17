import type { CanvasStore } from '../../../canvasStore';
import { isElementFlagged, toggleId } from './groupSliceHelpers';
import type { GroupFlagCache, GroupSlice, GroupSliceGet, GroupSliceSet } from './groupSliceTypes';

type VisibilityActions = Pick<
  GroupSlice,
  | 'toggleGroupVisibility'
  | 'toggleGroupLock'
  | 'toggleElementVisibility'
  | 'toggleElementLock'
  | 'showAllElements'
  | 'unlockAllElements'
  | 'isElementHidden'
  | 'isElementLocked'
>;

export const createGroupSliceVisibilityActions = (
  set: GroupSliceSet,
  get: GroupSliceGet,
  flagCache: GroupFlagCache
): VisibilityActions => {
  /** Shared helper for toggling a boolean flag on a group element's data. */
  const toggleGroupDataFlag = (groupId: string, flag: 'isHidden' | 'isLocked') => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              [flag]: !element.data[flag],
            },
          };
        }
        return element;
      }),
    }));
  };

  /** Shared helper for clearing a boolean flag on all group elements. */
  const clearGroupDataFlag = (flag: 'isHidden' | 'isLocked', idsField: 'hiddenElementIds' | 'lockedElementIds') => {
    set((storeState) => {
      const currentState = storeState as CanvasStore;
      const updatedElements = currentState.elements.map((el) => {
        if (el.type === 'group') {
          return {
            ...el,
            data: {
              ...el.data,
              [flag]: false,
            },
          };
        }
        return el;
      });

      return {
        [idsField]: [],
        elements: updatedElements,
      };
    });
  };

  return {
    toggleGroupVisibility: (groupId) => toggleGroupDataFlag(groupId, 'isHidden'),
    toggleGroupLock: (groupId) => toggleGroupDataFlag(groupId, 'isLocked'),

  toggleElementVisibility: (elementId) => {
    const state = get() as CanvasStore;
    // Use cached elementMap for O(1) lookup instead of O(n) find
    const elementMap = flagCache.elementMap.source === state.elements
      ? flagCache.elementMap.map
      : new Map(state.elements.map((el) => [el.id, el]));
    if (!elementMap.has(elementId)) {
      return;
    }

    set((storeState) => {
      const currentState = storeState as CanvasStore;
      return {
        hiddenElementIds: toggleId(currentState.hiddenElementIds, elementId),
      };
    });
  },

  toggleElementLock: (elementId) => {
    const state = get() as CanvasStore;
    // Use cached elementMap for O(1) lookup instead of O(n) find
    const elementMap = flagCache.elementMap.source === state.elements
      ? flagCache.elementMap.map
      : new Map(state.elements.map((el) => [el.id, el]));
    if (!elementMap.has(elementId)) {
      return;
    }

    set((storeState) => {
      const currentState = storeState as CanvasStore;
      return {
        lockedElementIds: toggleId(currentState.lockedElementIds, elementId),
      };
    });
  },

  showAllElements: () => clearGroupDataFlag('isHidden', 'hiddenElementIds'),
  unlockAllElements: () => clearGroupDataFlag('isLocked', 'lockedElementIds'),

  isElementHidden: (elementId) => isElementFlagged(get, flagCache, elementId, 'hidden'),
  isElementLocked: (elementId) => isElementFlagged(get, flagCache, elementId, 'locked'),
  };
};
