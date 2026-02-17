import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { FilterDefinition } from './filters';

export interface FilterSlice {
  filters: Record<string, FilterDefinition>;
  importedFilters?: FilterDefinition[];
  upsertFilter: (def: FilterDefinition) => void;
  removeFilter: (id: string) => void;
}

export const createFilterSlice: StateCreator<CanvasStore, [], [], FilterSlice> = (set, get) => {
  const current = get() as unknown as FilterSlice;
  const persistedFilters = current.filters;
  const persistedImportedFilters = current.importedFilters;

  return {
    filters:
      persistedFilters && typeof persistedFilters === 'object'
        ? persistedFilters
        : {},
    importedFilters: Array.isArray(persistedImportedFilters) ? persistedImportedFilters : [],
    upsertFilter: (def) => set((state) => ({
      filters: {
        ...(state as unknown as FilterSlice).filters,
        [def.id]: def,
      },
    })),
    removeFilter: (id) => set((state) => {
      const currentFilters = { ...(state as unknown as FilterSlice).filters };
      delete currentFilters[id];
      return { filters: currentFilters };
    }),
  };
};
