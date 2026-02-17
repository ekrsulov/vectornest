import { useSyncExternalStore } from 'react';
import { pluginManager } from './pluginManager';

interface PluginHooksSnapshot {
  visibleToolIds: string[];
  disabledToolIds: string[];
  isGlobalUndoRedoDisabled: boolean;
}

const EMPTY_SNAPSHOT: PluginHooksSnapshot = {
  visibleToolIds: [],
  disabledToolIds: [],
  isGlobalUndoRedoDisabled: false,
};

let snapshot: PluginHooksSnapshot = EMPTY_SNAPSHOT;
let storeUnsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

const areArraysEqual = (a: string[], b: string[]): boolean => (
  a.length === b.length && a.every((value, index) => value === b[index])
);

const computeSnapshot = (): PluginHooksSnapshot => {
  const storeApi = pluginManager.getStoreApi();
  if (!storeApi) {
    return EMPTY_SNAPSHOT;
  }

  const state = storeApi.getState();
  return {
    visibleToolIds: pluginManager.getVisibleToolIds(state),
    disabledToolIds: pluginManager.getDisabledToolIds(state),
    isGlobalUndoRedoDisabled: pluginManager.isGlobalUndoRedoDisabled(),
  };
};

const updateSnapshot = (): void => {
  const next = computeSnapshot();

  if (
    areArraysEqual(snapshot.visibleToolIds, next.visibleToolIds) &&
    areArraysEqual(snapshot.disabledToolIds, next.disabledToolIds) &&
    snapshot.isGlobalUndoRedoDisabled === next.isGlobalUndoRedoDisabled
  ) {
    return;
  }

  snapshot = next;
  listeners.forEach((listener) => listener());
};

const ensureStoreSubscription = (): void => {
  if (storeUnsubscribe) {
    return;
  }

  const storeApi = pluginManager.getStoreApi();
  if (!storeApi) {
    return;
  }

  snapshot = computeSnapshot();

  // Only recompute when keys that actually affect visibility/disabled change.
  // Previously subscribed to every store change (~60Hz during drawing).
  let prevSelectedIds = storeApi.getState().selectedIds;
  let prevElements = storeApi.getState().elements;
  let prevActivePlugin = storeApi.getState().activePlugin;

  storeUnsubscribe = storeApi.subscribe(() => {
    const state = storeApi.getState();
    const sameSelectedIds = state.selectedIds === prevSelectedIds;
    const sameElements = state.elements === prevElements;
    const sameActivePlugin = state.activePlugin === prevActivePlugin;

    // Skip recomputation if none of the relevant keys changed
    if (sameSelectedIds && sameElements && sameActivePlugin) {
      return;
    }

    prevSelectedIds = state.selectedIds;
    prevElements = state.elements;
    prevActivePlugin = state.activePlugin;

    updateSnapshot();
  });
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  ensureStoreSubscription();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storeUnsubscribe) {
      storeUnsubscribe();
      storeUnsubscribe = null;
    }
  };
};

const getSnapshot = (): PluginHooksSnapshot => {
  ensureStoreSubscription();
  return snapshot;
};

/**
 * React hook that returns the list of visible tool IDs.
 * Uses a shared store subscription for all plugin visibility hooks.
 */
export function useVisibleToolIds(): string[] {
  return useSyncExternalStore(subscribe, () => getSnapshot().visibleToolIds, () => EMPTY_SNAPSHOT.visibleToolIds);
}

/**
 * React hook that returns the list of disabled tool IDs.
 * Uses a shared store subscription for all plugin visibility hooks.
 */
export function useDisabledToolIds(): string[] {
  return useSyncExternalStore(subscribe, () => getSnapshot().disabledToolIds, () => EMPTY_SNAPSHOT.disabledToolIds);
}

/**
 * React hook that returns whether global undo/redo should be disabled.
 * Uses a shared store subscription for all plugin visibility hooks.
 */
export function useIsGlobalUndoRedoDisabled(): boolean {
  return useSyncExternalStore(subscribe, () => getSnapshot().isGlobalUndoRedoDisabled, () => false);
}
