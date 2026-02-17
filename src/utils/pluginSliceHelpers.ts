import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../types';
import type {
  SimplePluginSlice,
} from '../types/plugins';
import { buildElementMap } from './elementMapUtils';

/**
 * Helper type for selected subpath elements
 */
export interface SelectedSubpathElement {
  element: CanvasElement;
  subpathIndex: number;
}

/**
 * Centralized helper to get selected subpath elements from state
 * Eliminates duplication across baseSlice, performPathSimplify, and performSubPathReverse
 *
 * @param elements - Array of canvas elements
 * @param selectedSubpaths - Array of selected subpath references
 * @returns Array of elements with their selected subpath indices
 */
export function getSelectedSubpathElements(
  elements: CanvasElement[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): SelectedSubpathElement[] {
  const elementMap = buildElementMap(elements);
  return selectedSubpaths
    .map(sp => {
      const element = elementMap.get(sp.elementId);
      if (element && element.type === 'path') {
        return { element, subpathIndex: sp.subpathIndex };
      }
      return null;
    })
    .filter(Boolean) as SelectedSubpathElement[];
}

/**
 * Centralized helper to get all selected paths (full paths + individual subpaths as separate paths)
 * Used for boolean operations and other path manipulations
 *
 * @param elements - Array of canvas elements
 * @param selectedIds - Array of selected element IDs
 * @param selectedSubpaths - Array of selected subpath references
 * @returns Array of PathData objects
 */
export function getSelectedPaths(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): PathData[] {
  const selectedIdSet = new Set(selectedIds);
  const selectedPaths = elements
    .filter(el => selectedIdSet.has(el.id) && el.type === 'path')
    .map(el => el.data as PathData);

  const subpathElements = getSelectedSubpathElements(elements, selectedSubpaths);

  // Handle selected subpaths by extracting them as separate paths
  const subpathPaths = subpathElements.map(({ element, subpathIndex }) => {
    const pathData = element.data as PathData;
    return {
      ...pathData,
      subPaths: [pathData.subPaths[subpathIndex]]
    };
  });

  return [...selectedPaths, ...subpathPaths];
}

/**
 * Creates a simple plugin slice with state merging logic.
 * Eliminates duplication across pencil, shape, and text plugin slices.
 *
 * @param sliceKey - The key name for the state (e.g., 'pencil', 'shape', 'text')
 * @param initialState - The initial state object
 * @returns A state creator with update method
 *
 * @example
 * ```ts
 * export const createTextPluginSlice = createSimplePluginSlice('text', {
 *   text: 'New',
 *   fontSize: 180,
 * });
 * ```
 */
export function createSimplePluginSlice<
  TSliceKey extends string,
  TState extends Record<string, unknown>,
  TSlice extends SimplePluginSlice<TSliceKey, TState>
>(
  sliceKey: TSliceKey,
  initialState: TState
): StateCreator<TSlice, [], [], TSlice> {
  const updateMethodName = `update${sliceKey.charAt(0).toUpperCase()}${sliceKey.slice(1)}State` as `update${Capitalize<TSliceKey>}State`;

  return (set) => ({
    [sliceKey]: initialState,
    [updateMethodName]: (state: Partial<TState>) => {
      set((current) => ({
        [sliceKey]: { ...current[sliceKey as keyof typeof current] as TState, ...state },
      } as Partial<TSlice>));
    },
  }) as TSlice;
}

/**
 * Creates a plugin slice with custom actions.
 * Use this for plugins that need more complex state management patterns.
 *
 * @param sliceKey - The key name for the state
 * @param initialState - The initial state object
 * @param actions - Object containing action functions
 * @returns A state creator with state and custom actions
 *
 * @example
 * ```ts
 * export const createCounterPluginSlice = createCustomPluginSlice('counter', {
 *   count: 0,
 * }, (set, get) => ({
 *   increment: () => {
 *     const current = get().counter.count;
 *     set({ counter: { count: current + 1 } }, false);
 *   },
 * }));
 * ```
 */
export function createCustomPluginSlice<
  TSliceKey extends string,
  TState extends Record<string, unknown>,
  TSlice extends {
    [K in TSliceKey]: TState;
  }
>(
  sliceKey: TSliceKey,
  initialState: TState,
  actions: (
    set: (partial: Partial<TSlice>, replace?: boolean) => void,
    get: () => TSlice
  ) => Omit<TSlice, TSliceKey>
): StateCreator<TSlice, [], [], TSlice> {
  return (set, get) => {
    const actionFunctions = actions(
      (partial: Partial<TSlice>) => set(partial),
      get
    );

    return {
      [sliceKey]: initialState,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...actionFunctions as any,
    } as TSlice;
  };
}
