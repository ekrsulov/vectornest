/**
 * State slice for Library Filters plugin
 */

import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { buildElementMap } from '../../utils';
import type { FilterDefinition } from './types';

export interface LibraryFiltersSlice {
  libraryFilters: FilterDefinition[];
  addLibraryFilter: (filter: Omit<FilterDefinition, 'id'>) => void;
  updateLibraryFilter: (id: string, updates: Partial<Omit<FilterDefinition, 'id'>>) => void;
  removeLibraryFilter: (id: string) => void;
  duplicateLibraryFilter: (id: string) => void;
  applyFilterToSelection: (filterId: string) => void;
  removeFilterFromSelection: () => void;
}

const generateFilterId = () => `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type ChildIdContainer = { childIds?: string[] };

const safeChildIds = (data: ChildIdContainer | null | undefined): string[] => (
  Array.isArray(data?.childIds) ? data.childIds : []
);

const forEachSelectedLeafElement = (
  selectedIds: string[],
  elementsById: Map<string, CanvasElement>,
  visitLeaf: (element: CanvasElement) => void
): void => {
  const queue = [...selectedIds];
  const visited = new Set<string>();

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const elementId = queue[queueIndex];
    if (visited.has(elementId)) continue;
    visited.add(elementId);

    const element = elementsById.get(elementId);
    if (!element) continue;

    if (element.type === 'group') {
      queue.push(...safeChildIds(element.data as ChildIdContainer));
      continue;
    }

    visitLeaf(element);
  }
};

export const createLibraryFiltersSlice: StateCreator<
  CanvasStore,
  [],
  [],
  LibraryFiltersSlice
> = (set, get) => {
  // Preserve persisted state if it exists, otherwise use empty array
  const currentState = get();
  const persistedFilters = (currentState as unknown as LibraryFiltersSlice).libraryFilters;
  
  return {
  libraryFilters: Array.isArray(persistedFilters) ? persistedFilters : [],

  addLibraryFilter: (filter) => {
    const newFilter: FilterDefinition = {
      ...filter,
      id: generateFilterId(),
    };
    set((state) => ({
      libraryFilters: [...(state as unknown as LibraryFiltersSlice).libraryFilters || [], newFilter],
    }));
  },

  updateLibraryFilter: (id, updates) => {
    set((state) => {
      const slice = state as unknown as LibraryFiltersSlice;
      return {
        libraryFilters: (slice.libraryFilters || []).map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      };
    });
  },

  removeLibraryFilter: (id) => {
    set((state) => {
      const slice = state as unknown as LibraryFiltersSlice;
      return {
        libraryFilters: (slice.libraryFilters || []).filter((f) => f.id !== id),
      };
    });

    // Clean up elements that use this filter
    const store = get();
    const { elements, updateElement } = store;

    elements.forEach((element) => {
      // Check PathData filterId
      if (element.type === 'path' && element.data && 'filterId' in element.data) {
        if (element.data.filterId === id) {
          updateElement?.(element.id, {
            data: {
              ...element.data,
              filterId: undefined,
            },
          });
        }
      }
    });
  },

  duplicateLibraryFilter: (id) => {
    const state = get() as unknown as LibraryFiltersSlice & CanvasStore;
    const filter = (state.libraryFilters || []).find((f) => f.id === id);
    if (!filter) return;
    
    const newFilter: FilterDefinition = {
      ...filter,
      id: generateFilterId(),
      name: `${filter.name} Copy`,
    };
    
    set((state) => {
      const slice = state as unknown as LibraryFiltersSlice;
      return {
        libraryFilters: [...(slice.libraryFilters || []), newFilter],
      };
    });
  },

  applyFilterToSelection: (filterId) => {
    const store = get();
    const { selectedIds, updateElement, temporal } = store;
    
    if (!selectedIds.length) return;
    
    // Pause temporal to batch this as a single undo step
    temporal?.getState().pause();

    const elementsById = buildElementMap(get().elements);
    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      // Apply filter to supported element types
      if (!element.data) return;

      const supported =
        element.type === 'path' ||
        element.type === 'image' ||
        element.type === 'nativeText' ||
        element.type === 'nativeShape' ||
        element.type === 'symbolInstance';
      if (!supported) return;

      updateElement?.(element.id, {
        data: {
          ...element.data,
          filterId,
        },
      });
    });

    temporal?.getState().resume();
  },

  removeFilterFromSelection: () => {
    const store = get();
    const { selectedIds, updateElement, temporal } = store;
    
    if (!selectedIds.length) return;

    // Pause temporal to batch this as a single undo step
    temporal?.getState().pause();

    const elementsById = buildElementMap(get().elements);
    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      const dataObj = element.data as Record<string, unknown> | undefined;
      if (!dataObj || !('filterId' in dataObj)) return;

      updateElement?.(element.id, {
        data: {
          ...element.data,
          filterId: undefined,
        },
      });
    });

    temporal?.getState().resume();
  },

  // Allow external selection via the Library Search panel
  selectedFromSearch: null,
  selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),
  };
};

export type { FilterDefinition };
