import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import isDeepEqual from 'fast-deep-equal';
import type { PluginSliceFactory } from '../types/plugins';
import { UNDO_HISTORY_LIMIT, HISTORY_DEBOUNCE_MS } from '../constants';
import { debounce } from '../utils/debounce';

// Import only core structural slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createGroupSlice, type GroupSlice } from './slices/features/groupSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createSnapPointsSlice, type SnapPointsSlice } from './slices/features/snapPointsSlice';
import { createStyleSlice, type StyleSlice } from './slices/features/styleSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createGeometrySlice, type GeometrySlice } from './slices/features/geometrySlice';
import { createGroupEditorSlice, type GroupEditorSlice } from './slices/features/groupEditorSlice';
import { buildPersistPartialize, buildTemporalPartialize, runMigrations } from './persistenceRegistry';

// Core Canvas Store - only structural slices
export type CoreCanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  GroupSlice &
  OrderSlice &
  ArrangeSlice &
  SnapPointsSlice &
  StyleSlice &
  UiSlice &
  GeometrySlice &
  GroupEditorSlice;

// Keep plugin state permissive because plugin slices are dynamic at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginStateMap = Record<string, any>;

/**
 * Extended Canvas Store type that includes plugin slices.
 * 
 * Plugins extend this dynamically at runtime by registering their slices.
 * Plugin state remains dynamically typed to preserve compatibility with
 * existing plugin slices and selectors.
 * 
 * For type-safe access, prefer plugin-specific selectors:
 * @example
 * // Instead of: useCanvasStore(state => state.myPluginState)
 * // Use: useCanvasStore(myPluginSelector)
 * 
 * @see registerPluginSlices for how plugins register their state
 */
export type CanvasStore = CoreCanvasStore & PluginStateMap;

type SpecialPanelVisibilityState = Pick<
  CanvasStore,
  'showFilePanel' | 'showSettingsPanel' | 'showLibraryPanel'
>;

const resolveSpecialPanelVisibility = (
  activePlugin: string | null | undefined
): SpecialPanelVisibilityState => {
  switch (activePlugin) {
    case 'file':
      return {
        showFilePanel: true,
        showSettingsPanel: false,
        showLibraryPanel: false,
      };
    case 'settings':
      return {
        showFilePanel: false,
        showSettingsPanel: true,
        showLibraryPanel: false,
      };
    case 'library':
      return {
        showFilePanel: false,
        showSettingsPanel: false,
        showLibraryPanel: true,
      };
    default:
      return {
        showFilePanel: false,
        showSettingsPanel: false,
        showLibraryPanel: false,
      };
  }
};


// Create the store with core slices only - plugins will register dynamically
export const useCanvasStore = create<CanvasStore>()(
  persist(
    temporal(
      (set, get, api) => ({
        // Core structural slices only
        ...createBaseSlice(set, get, api),
        ...createViewportSlice(set, get, api),
        ...createSelectionSlice(set, get, api),
        ...createGroupSlice(set, get, api),
        ...createOrderSlice(set, get, api),
        ...createArrangeSlice(set, get, api),
        ...createSnapPointsSlice(set, get, api),
        ...createStyleSlice(set, get, api),
        ...createUiSlice(set, get, api),
        ...createGeometrySlice(set, get, api),
        ...createGroupEditorSlice(set, get, api),

        // Plugin slices are now registered dynamically through registerPluginSlices
        // Cross-slice actions have been moved to their respective plugins
      }),
      {
        limit: UNDO_HISTORY_LIMIT,
        partialize: buildTemporalPartialize(),
        equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
        handleSet: (handleSet) =>
          debounce<typeof handleSet>((state) => {
            handleSet(state);
          }, HISTORY_DEBOUNCE_MS),
      }
    ),
    {
      name: 'canvas-app-state',
      version: 3,
      migrate: (persistedState: unknown, version: number) => runMigrations(persistedState, version),
      partialize: buildPersistPartialize(),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          return;
        }

        const nextVisibility = resolveSpecialPanelVisibility(state.activePlugin);
        const shouldUpdateVisibility =
          state.showFilePanel !== nextVisibility.showFilePanel ||
          state.showSettingsPanel !== nextVisibility.showSettingsPanel ||
          state.showLibraryPanel !== nextVisibility.showLibraryPanel;

        if (!shouldUpdateVisibility) {
          return;
        }

        state.setShowFilePanel(nextVisibility.showFilePanel);
        state.setShowSettingsPanel(nextVisibility.showSettingsPanel);
        state.setShowLibraryPanel(nextVisibility.showLibraryPanel);
      },
    }
  )
);

export type CanvasStoreApi = StoreApi<CanvasStore>;

export const canvasStoreApi: CanvasStoreApi = useCanvasStore as unknown as CanvasStoreApi;

type PluginSliceContribution<TStore extends object> = ReturnType<PluginSliceFactory<TStore>>;

const pluginSliceCleanups = new Map<string, Array<() => void>>();

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const mergePluginState = (currentValue: unknown, pluginDefaultValue: unknown): unknown => {
  // Prefer existing persisted values when present.
  if (currentValue !== undefined && currentValue !== null) {
    if (!isPlainObject(currentValue) || !isPlainObject(pluginDefaultValue)) {
      return currentValue;
    }

    // Deep merge recursively so nested plugin defaults are still applied.
    // Only keep keys present in pluginDefaultValue to strip stale persisted keys.
    const merged: Record<string, unknown> = { ...pluginDefaultValue };
    Object.keys(pluginDefaultValue).forEach((key) => {
      if (key in currentValue) {
        merged[key] = mergePluginState(currentValue[key], pluginDefaultValue[key]);
      }
    });
    return merged;
  }

  return pluginDefaultValue;
};

const applyPluginSlice = <TStore extends object>(
  storeApi: StoreApi<TStore>,
  partial: Partial<TStore>
): (() => void) => {
  const previousValues: Partial<Record<keyof TStore, TStore[keyof TStore]>> = {};
  const keys = Object.keys(partial) as (keyof TStore)[];

  keys.forEach((key) => {
    previousValues[key] = storeApi.getState()[key];
  });

  const currentState = storeApi.getState();
  const merged: Partial<TStore> = {};

  keys.forEach((key) => {
    const currentValue = currentState[key];
    const newValue = partial[key];
    merged[key] = mergePluginState(currentValue, newValue) as TStore[keyof TStore];
  });

  storeApi.setState(merged as Partial<TStore>);

  return () => {
    const restore: Partial<Record<keyof TStore, TStore[keyof TStore]>> = {};
    keys.forEach((key) => {
      restore[key] = previousValues[key];
    });
    storeApi.setState(restore as Partial<TStore>);
  };
};

export const registerPluginSlices = <TStore extends object>(
  storeApi: StoreApi<TStore>,
  pluginId: string,
  contributions: PluginSliceContribution<TStore>[]
): void => {
  if (contributions.length === 0) {
    return;
  }

  unregisterPluginSlices(storeApi, pluginId);

  const cleanups: Array<() => void> = [];

  contributions.forEach(({ state, cleanup }) => {
    cleanups.push(applyPluginSlice(storeApi, state));
    if (cleanup) {
      cleanups.push(() => cleanup(storeApi.setState, storeApi.getState, storeApi));
    }
  });

  pluginSliceCleanups.set(pluginId, cleanups);
};

export function unregisterPluginSlices<TStore extends object>(_storeApi: StoreApi<TStore>, pluginId: string): void {
  const cleanups = pluginSliceCleanups.get(pluginId);
  if (!cleanups) {
    return;
  }

  [...cleanups].reverse().forEach((cleanup) => {
    cleanup();
  });

  pluginSliceCleanups.delete(pluginId);
}
