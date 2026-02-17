import type { CanvasElement } from '../../types';
import type { FilterSlice } from './slice';
import React from 'react';
import { serializeFilterDefs as serializeDefsInternal, renderFilterElement } from './filters';

export const collectUsedFilterIds = (elements: CanvasElement[]): Set<string> => {
  const ids = new Set<string>();
  const check = (v?: string) => {
    if (v) ids.add(v);
  };
  elements.forEach(el => {
    const data = (el as { data?: { filterId?: string; textPath?: { filterId?: string } } }).data;
    if (data?.filterId) check(data.filterId);
    if (data?.textPath?.filterId) check(data.textPath.filterId);
  });
  return ids;
};

export const serializeFilterDefs = (state: FilterSlice, used: Set<string>): string[] => {
  const sliceDefs = Object.values(state.filters ?? {});
  const importedDefs = (state as unknown as { importedFilters?: typeof sliceDefs }).importedFilters ?? [];
  const allDefs = [...sliceDefs, ...importedDefs].reduce((acc, def) => {
    acc.set(def.id, def);
    return acc;
  }, new Map<string, (typeof sliceDefs)[number]>());
  const defs = Array.from(allDefs.values());
  const effectiveUsed = used.size > 0 ? used : new Set(defs.map(d => d.id));
  const selected = defs.filter(def => effectiveUsed.has(def.id));
  return serializeDefsInternal(selected, effectiveUsed);
};

export const renderFilterDefs = (state: FilterSlice, used: Set<string>): React.ReactNode => {
  const sliceDefs = Object.values(state.filters ?? {});
  const importedDefs = (state as unknown as { importedFilters?: typeof sliceDefs }).importedFilters ?? [];
  const allDefs = [...sliceDefs, ...importedDefs].reduce((acc, def) => {
    acc.set(def.id, def);
    return acc;
  }, new Map<string, (typeof sliceDefs)[number]>());
  const defs = Array.from(allDefs.values()).filter(def => used.size === 0 || used.has(def.id));
  return defs.map(def => React.cloneElement(renderFilterElement(def), { key: def.id }));
};
