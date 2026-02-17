/**
 * StoreAccessor - Unified state access pattern for plugins
 *
 * Provides a consistent, type-safe way to access and update store state
 * without requiring direct imports of useCanvasStore or unsafe castings.
 *
 * Benefits:
 * - Single access pattern across all plugins
 * - Type-safe selections and updates
 * - Automatic subscription cleanup
 * - Easier testing through mockable interface
 *
 * @module StoreAccessor
 */

import type { StoreApi } from 'zustand';

/**
 * Interface for type-safe store access.
 * 
 * @template TStore - The full store type
 * @template TSlice - Optional slice type for plugin-specific state
 *
 * @example
 * ```ts
 * // In a plugin handler
 * const accessor = context.accessor as StoreAccessor<CanvasStore, PencilSlice>;
 * 
 * // Get specific slice state
 * const pencilState = accessor.select(s => s.pencil);
 * 
 * // Update state
 * accessor.update({ pencil: { ...pencilState, isDrawing: true } });
 * 
 * // Subscribe to changes
 * const unsubscribe = accessor.subscribe(
 *   s => s.pencil.isDrawing,
 *   (isDrawing) => console.log('Drawing state:', isDrawing)
 * );
 * ```
 */
export interface StoreAccessor<TStore extends object, TSlice extends object = TStore> {
  /**
   * Get the current full store state.
   * Prefer `select` for specific slices to improve performance.
   */
  get: () => TStore;

  /**
   * Select a specific part of the state.
   * More performant than `get()` for targeted access.
   *
   * @template TResult - The type of the selected value
   * @param selector - Function to extract desired state
   * @returns The selected value
   */
  select: <TResult>(selector: (state: TStore & TSlice) => TResult) => TResult;

  /**
   * Update the store state.
   * Supports both partial objects and updater functions.
   *
   * @param partial - Partial state or updater function
   */
  update: (partial: Partial<TStore & TSlice> | ((state: TStore & TSlice) => Partial<TStore & TSlice>)) => void;

  /**
   * Subscribe to state changes with a selector.
   * Only triggers callback when selected value changes.
   *
   * @template TResult - The type of the selected value
   * @param selector - Function to extract watched state
   * @param callback - Function called when selected value changes
   * @returns Unsubscribe function
   */
  subscribe: <TResult>(
    selector: (state: TStore & TSlice) => TResult,
    callback: (value: TResult, prevValue: TResult) => void
  ) => () => void;

  /**
   * Check if a specific property exists in the state.
   *
   * @param key - Property key to check
   * @returns true if the property exists
   */
  has: (key: keyof (TStore & TSlice)) => boolean;
}

/**
 * Creates a StoreAccessor from a Zustand store API.
 *
 * @template TStore - The full store type
 * @template TSlice - Optional slice type for plugin-specific state
 * @param storeApi - Zustand store API
 * @returns StoreAccessor instance
 *
 * @example
 * ```ts
 * const accessor = createStoreAccessor<CanvasStore, PencilSlice>(storeApi);
 * const pencilState = accessor.select(s => s.pencil);
 * ```
 */
export function createStoreAccessor<TStore extends object, TSlice extends object = TStore>(
  storeApi: Pick<StoreApi<TStore>, 'getState' | 'setState' | 'subscribe'>
): StoreAccessor<TStore, TSlice> {
  return {
    get: () => storeApi.getState(),

    select: <TResult>(selector: (state: TStore & TSlice) => TResult): TResult => {
      return selector(storeApi.getState() as TStore & TSlice);
    },

    update: (
      partial: Partial<TStore & TSlice> | ((state: TStore & TSlice) => Partial<TStore & TSlice>)
    ) => {
      if (typeof partial === 'function') {
        const currentState = storeApi.getState() as TStore & TSlice;
        const newPartial = partial(currentState);
        storeApi.setState(newPartial as Partial<TStore>);
      } else {
        storeApi.setState(partial as Partial<TStore>);
      }
    },

    subscribe: <TResult>(
      selector: (state: TStore & TSlice) => TResult,
      callback: (value: TResult, prevValue: TResult) => void
    ): (() => void) => {
      let currentValue = selector(storeApi.getState() as TStore & TSlice);

      return storeApi.subscribe((state) => {
        const nextValue = selector(state as TStore & TSlice);
        if (!Object.is(currentValue, nextValue)) {
          const prevValue = currentValue;
          currentValue = nextValue;
          callback(nextValue, prevValue);
        }
      });
    },

    has: (key: keyof (TStore & TSlice)): boolean => {
      return key in storeApi.getState();
    },
  };
}


