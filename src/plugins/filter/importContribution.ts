import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { FilterSlice } from './slice';
import type { FilterDefinition } from './filters';

registerImportContribution<FilterDefinition>({
  pluginId: 'filter',
  merge: (imports) => {
    const defs = imports as FilterDefinition[] | undefined;
    if (!defs || defs.length === 0) return;
    const filterState = canvasStoreApi.getState() as unknown as FilterSlice;
    if (filterState.filters === undefined) return;
    const mergedFilters = { ...(filterState.filters ?? {}) };
    const importedMap = new Map<string, FilterDefinition>();
    (filterState.importedFilters ?? []).forEach((def) => importedMap.set(def.id, def));
    defs.forEach((def) => {
      mergedFilters[def.id] = def;
      importedMap.set(def.id, def);
    });
    canvasStoreApi.setState({
      filters: mergedFilters,
      importedFilters: Array.from(importedMap.values()),
    } as Partial<FilterSlice>);
  },
});
