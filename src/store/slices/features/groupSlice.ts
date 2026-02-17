import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { registerCleanupHook } from '../../cleanupHookRegistry';
import { createGroupSliceGroupingActions } from './group/groupSliceGroupingActions';
import { createGroupSliceVisibilityActions } from './group/groupSliceVisibilityActions';
import { createIdSetCacheEntry } from './group/groupSliceHelpers';
import type { GroupFlagCache, GroupSlice } from './group/groupSliceTypes';

export type { GroupSlice } from './group/groupSliceTypes';

// Register cleanup hook to remove deleted element IDs from hidden/locked lists
registerCleanupHook('group-visibility', (deletedElementIds, _remainingElements, state) => {
  const fullState = state as CanvasStore & GroupSlice;
  const deletedSet = new Set(deletedElementIds);
  const hiddenElementIds = fullState.hiddenElementIds?.filter((id) => !deletedSet.has(id));
  const lockedElementIds = fullState.lockedElementIds?.filter((id) => !deletedSet.has(id));

  // Only return updates if something actually changed
  const updates: Partial<CanvasStore> = {};
  if (hiddenElementIds && hiddenElementIds.length !== fullState.hiddenElementIds?.length) {
    (updates as Record<string, unknown>).hiddenElementIds = hiddenElementIds;
  }
  if (lockedElementIds && lockedElementIds.length !== fullState.lockedElementIds?.length) {
    (updates as Record<string, unknown>).lockedElementIds = lockedElementIds;
  }
  if (Object.keys(updates).length > 0) return updates;
});

export const createGroupSlice: StateCreator<CanvasStore, [], [], GroupSlice> = (set, get) => {
  const flagCache: GroupFlagCache = {
    hidden: createIdSetCacheEntry(),
    locked: createIdSetCacheEntry(),
    elementMap: {
      source: null,
      map: new Map<string, CanvasElement>(),
    },
  };

  return {
    groupNameCounter: 1,
    hiddenElementIds: [],
    lockedElementIds: [],

    ...createGroupSliceGroupingActions(set, get),
    ...createGroupSliceVisibilityActions(set, get, flagCache),
  };
};
