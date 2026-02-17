import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../store/canvasStore';
import type { PluginSliceFactory } from '../types/plugins';

/**
 * Helper to create a PluginSliceFactory without boilerplate.
 * Converts a Zustand StateCreator into a PluginSliceFactory.
 *
 * Accepts two common slice creator signatures:
 * - `StateCreator<SliceType, [], [], SliceType>` (self-contained slice)
 * - `StateCreator<CanvasStore, [], [], SliceType>` (slice that reads from full store)
 *
 * @example
 * ```ts
 * // Before (manual boilerplate)
 * const gridSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
 *   const slice = createGridPluginSlice(set as any, get as any, api as any);
 *   return { state: slice };
 * };
 *
 * // After (with helper)
 * const gridSliceFactory = createPluginSlice(createGridPluginSlice);
 * ```
 */
export function createPluginSlice<TResult extends object>(
  sliceCreator: StateCreator<CanvasStore, never[], never[], TResult>
): PluginSliceFactory<CanvasStore>;
export function createPluginSlice<TSlice extends object>(
  sliceCreator: StateCreator<TSlice, never[], never[], TSlice>
): PluginSliceFactory<CanvasStore>;
export function createPluginSlice(
  sliceCreator: StateCreator<CanvasStore, never[], never[], Partial<CanvasStore>>
): PluginSliceFactory<CanvasStore> {
  // The slice creator expects set/get/api typed for its store type, but at runtime
  // the store is CanvasStore with the slice dynamically merged. The cast
  // is safe because plugin slices only read/write their own state keys.
  const bridged = sliceCreator as StateCreator<CanvasStore, never[], never[], Partial<CanvasStore>>;
  return (set, get, api) => ({
    state: bridged(set, get, api)
  });
}
