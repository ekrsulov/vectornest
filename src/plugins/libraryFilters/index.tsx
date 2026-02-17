/**
 * Library Filters Plugin
 * Provides a library of filter presets that can be applied to elements
 */

import { Filter } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { createLibraryFiltersSlice, type LibraryFiltersSlice, type FilterDefinition } from './slice';
import type { FilterPrimitive } from './types';
import { FiltersPanel } from './FiltersPanel';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { renderFilterNode } from './renderer';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { generateShortId } from '../../utils/idGenerator';
import { buildElementMap } from '../../utils';

registerStateKeys('libraryFilters', ['libraryFilters'], 'persist');

const libraryFiltersSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createLibraryFiltersSlice(set, get, api),
});

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const safeChildIds = (data: { childIds?: string[] } | null | undefined): string[] => (
  Array.isArray(data?.childIds) ? data.childIds : []
);

/**
 * Collect filter IDs that are actually being used by elements
 */
const collectFilterUsage = (elements: CanvasElement[]): Set<string> => {
  const usage = new Set<string>();
  const elementsById = buildElementMap(elements);
  const visited = new Set<string>();
  const queue: string[] = [];

  const checkData = (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const obj = data as Record<string, unknown>;
    const fid = obj.filterId;
    if (typeof fid === 'string' && fid) usage.add(fid);
    const tp = obj.textPath as Record<string, unknown> | undefined;
    if (tp && typeof tp.filterId === 'string' && tp.filterId) usage.add(tp.filterId);
  };

  elements.forEach((element) => {
    checkData((element as { data?: unknown }).data);
    if (element.type === 'group') {
      queue.push(...safeChildIds(element.data as { childIds?: string[] }));
    }
  });

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const childId = queue[queueIndex];
    if (visited.has(childId)) continue;
    visited.add(childId);

    const child = elementsById.get(childId);
    if (!child) continue;

    checkData((child as { data?: unknown }).data);
    if (child.type === 'group') {
      queue.push(...safeChildIds(child.data as { childIds?: string[] }));
    }
  }

  return usage;
};

/**
 * Render a single filter primitive to SVG
 */
const renderFilterPrimitive = (primitive: FilterPrimitive): string => {
  const { type, ...attrs } = primitive;

  // Special handling for primitives with nested content
  if (type === 'feMerge' && Array.isArray(primitive.feMergeNodes)) {
    const nodes = (primitive.feMergeNodes as Array<{ in?: string }>).map((node) =>
      `<feMergeNode in="${escapeAttr(node.in || 'SourceGraphic')}" />`
    ).join('');
    return `<feMerge>${nodes}</feMerge>`;
  }

  // Special handling for lighting filters with light sources
  if ((type === 'feDiffuseLighting' || type === 'feSpecularLighting') && primitive.lightSource) {
    const lightAttrs = Object.entries(primitive.lightSource as Record<string, unknown>)
      .filter(([key]) => key !== 'type')
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const lightTag = (primitive.lightSource as Record<string, unknown>).type || 'feDistantLight';

    const filterAttrs = Object.entries(attrs)
      .filter(([key]) => key !== 'lightSource')
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `<${type} ${filterAttrs}><${lightTag} ${lightAttrs} /></${type}>`;
  }

  // Standard primitive rendering
  const attrString = Object.entries(attrs)
    .map(([key, value]) => {
      if (value === undefined || value === null) return '';
      return `${key}="${escapeAttr(String(value))}"`;
    })
    .filter(Boolean)
    .join(' ');

  return `<${type} ${attrString} />`;
};

/**
 * Register filter defs contribution
 */
defsContributionRegistry.register({
  id: 'libraryFilters',
  collectUsedIds: collectFilterUsage,
  renderDefs: (state, usedIds) => {
    const filterState = state as CanvasStore & LibraryFiltersSlice;
    const filters = filterState.libraryFilters ?? [];
    const usedFilters = filters.filter((filter) => usedIds.has(filter.id));
    if (!usedFilters.length) return null;

    return (
      <>
        {usedFilters.map(renderFilterNode)}
      </>
    );
  },
  serializeDefs: (state, usedIds) => {
    const filterState = state as CanvasStore & LibraryFiltersSlice;
    const filters = filterState.libraryFilters ?? [];
    const filtered = filters.filter((filter) => usedIds.has(filter.id));
    if (!filtered.length) return [];

    return filtered.map((filter) => {
      const primitives = filter.primitives.map((p) => renderFilterPrimitive(p)).join('\n  ');
      return `<filter id="${filter.id}" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">\n  ${primitives}\n</filter>`;
    });
  },
});

/**
 * Import filter definitions from SVG document
 */
const importFilterDefs = (doc: Document): Record<string, FilterDefinition[]> | null => {
  const filterNodes = Array.from(doc.querySelectorAll('filter'));
  if (!filterNodes.length) return null;

  const filters: FilterDefinition[] = filterNodes.map((node) => {
    const id = node.getAttribute('id') ?? generateShortId('flt');
    const name = id.replace(/^filter-/, '').replace(/-/g, ' ');

    // Extract primitives
    const primitives: FilterPrimitive[] = [];
    Array.from(node.children).forEach((child) => {
      const primitive: FilterPrimitive = { type: child.tagName };

      // Copy all attributes
      Array.from(child.attributes).forEach((attr) => {
        primitive[attr.name] = attr.value;
      });

      // Handle nested elements for feMerge
      if (child.tagName === 'feMerge') {
        primitive.feMergeNodes = Array.from(child.querySelectorAll('feMergeNode')).map((node) => ({
          in: node.getAttribute('in') || 'SourceGraphic'
        }));
      }

      // Handle light sources for lighting filters
      if (child.tagName === 'feDiffuseLighting' || child.tagName === 'feSpecularLighting') {
        const lightSource = child.querySelector('feDistantLight, fePointLight, feSpotLight');
        if (lightSource) {
          const lightSourceData: Record<string, unknown> = { type: lightSource.tagName };
          Array.from(lightSource.attributes).forEach((attr) => {
            lightSourceData[attr.name] = attr.value;
          });
          primitive.lightSource = lightSourceData;
        }
      }

      primitives.push(primitive);
    });

    return {
      id,
      name,
      type: 'blur' as const, // Default type, will be inferred from primitives
      category: 'basic' as const,
      primitives,
    };
  });

  return filters.length > 0 ? { libraryFilter: filters } : null;
};

/**
 * Plugin definition
 */
export const libraryFiltersPlugin: PluginDefinition<CanvasStore> = {
  id: 'libraryFilters',
  metadata: {
    label: 'Filters',
    icon: Filter,
  },
  slices: [libraryFiltersSliceFactory],
  importDefs: importFilterDefs,
  relatedPluginPanels: [
    {
      id: 'filters',
      targetPlugin: 'library',
      component: FiltersPanel,
      order: 6,
    },
  ],
};
