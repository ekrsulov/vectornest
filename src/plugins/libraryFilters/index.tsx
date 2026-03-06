/**
 * Library Filters Plugin
 * Provides a library of filter presets that can be applied to elements
 */

import { lazy } from 'react';
import { Filter } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { createLibraryFiltersSlice, type LibraryFiltersSlice, type FilterDefinition } from './slice';
import type { FilterPrimitive } from './types';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { renderFilterNode } from './renderer';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { generateShortId } from '../../utils/idGenerator';
import { buildElementMap } from '../../utils/elementMapUtils';
import { FILTER_PRESETS } from './presets';

registerStateKeys('libraryFilters', ['libraryFilters'], 'persist');

const libraryFiltersSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createLibraryFiltersSlice(set, get, api),
});
const FiltersPanel = lazy(() =>
  import('./FiltersPanel').then((module) => ({ default: module.FiltersPanel }))
);

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const safeChildIds = (data: { childIds?: string[] } | null | undefined): string[] => (
  Array.isArray(data?.childIds) ? data.childIds : []
);

const filterAttrString = (filter: FilterDefinition): string => [
  `id="${filter.id}"`,
  `x="${escapeAttr(filter.filterAttributes?.x ?? '-20%')}"`,
  `y="${escapeAttr(filter.filterAttributes?.y ?? '-20%')}"`,
  `width="${escapeAttr(filter.filterAttributes?.width ?? '140%')}"`,
  `height="${escapeAttr(filter.filterAttributes?.height ?? '140%')}"`,
  'filterUnits="objectBoundingBox"',
  'primitiveUnits="userSpaceOnUse"',
].join(' ');

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
  const normalizedAttrs = { ...(attrs as Record<string, unknown>) } as Record<string, unknown>;

  if (type === 'feColorMatrix') {
    const colorMatrixType = normalizedAttrs['colorMatrixType'] ?? normalizedAttrs['matrixType'];
    if (colorMatrixType !== undefined) {
      normalizedAttrs['type'] = colorMatrixType;
      delete normalizedAttrs['colorMatrixType'];
      delete normalizedAttrs['matrixType'];
    }
  }

  if (type === 'feTurbulence') {
    const turbulenceType = normalizedAttrs['turbulenceType'];
    if (turbulenceType !== undefined) {
      normalizedAttrs['type'] = turbulenceType;
      delete normalizedAttrs['turbulenceType'];
    }
  }

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

  if (type === 'feComponentTransfer') {
    const transferAttrs = { ...normalizedAttrs } as Record<string, unknown>;
    const funcEntries: Array<[string, string]> = [
      ['funcR', 'feFuncR'],
      ['funcG', 'feFuncG'],
      ['funcB', 'feFuncB'],
      ['funcA', 'feFuncA'],
      ['feFuncR', 'feFuncR'],
      ['feFuncG', 'feFuncG'],
      ['feFuncB', 'feFuncB'],
      ['feFuncA', 'feFuncA'],
    ];
    const renderedTags = new Set<string>();
    const children = funcEntries
      .map(([sourceKey, tag]) => {
        const data = transferAttrs[sourceKey] as Record<string, unknown> | undefined;
        if (!data) return '';
        if (renderedTags.has(tag)) return '';
        renderedTags.add(tag);
        delete transferAttrs[sourceKey];
        const funcAttrs = Object.entries(data)
          .map(([key, value]) => {
            if (value === undefined || value === null) return '';
            const attrKey = key === 'funcType' ? 'type' : key;
            return `${attrKey}="${escapeAttr(String(value))}"`;
          })
          .filter(Boolean)
          .join(' ');
        return `<${tag}${funcAttrs ? ` ${funcAttrs}` : ''} />`;
      })
      .filter(Boolean)
      .join('');

    const attrString = Object.entries(transferAttrs)
      .filter(([key]) => !funcEntries.some(([sourceKey]) => sourceKey === key))
      .map(([key, value]) => {
        if (value === undefined || value === null) return '';
        return `${key}="${escapeAttr(String(value))}"`;
      })
      .filter(Boolean)
      .join(' ');

    return `<${type}${attrString ? ` ${attrString}` : ''}>${children}</${type}>`;
  }

  const animChildren = Array.isArray(primitive.animateChildren)
    ? (primitive.animateChildren as Array<Record<string, unknown>>).map((anim) => {
      const { element: animTag, ...animAttrs } = anim;
      const attrString = Object.entries(animAttrs)
        .map(([key, value]) => {
          if (value === undefined || value === null) return '';
          return `${key}="${escapeAttr(String(value))}"`;
        })
        .filter(Boolean)
        .join(' ');
      return `<${animTag ?? 'animate'}${attrString ? ` ${attrString}` : ''} />`;
    }).join('')
    : '';

  // Standard primitive rendering
  const attrString = Object.entries(normalizedAttrs)
    .filter(([key]) => key !== 'animateChildren')
    .map(([key, value]) => {
      if (value === undefined || value === null) return '';
      return `${key}="${escapeAttr(String(value))}"`;
    })
    .filter(Boolean)
    .join(' ');

  if (animChildren) {
    return `<${type}${attrString ? ` ${attrString}` : ''}>${animChildren}</${type}>`;
  }

  return `<${type}${attrString ? ` ${attrString}` : ''} />`;
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
      return `<filter ${filterAttrString(filter)}>\n  ${primitives}\n</filter>`;
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

      const animChildren: Array<Record<string, unknown>> = [];
      Array.from(child.children).forEach((sub) => {
        if (sub.tagName === 'animate' || sub.tagName === 'animateTransform') {
          const animData: Record<string, unknown> = { element: sub.tagName };
          Array.from(sub.attributes).forEach((attr) => {
            animData[attr.name] = attr.value;
          });
          animChildren.push(animData);
        }
      });
      if (animChildren.length > 0) {
        primitive.animateChildren = animChildren;
      }

      primitives.push(primitive);
    });

    return {
      id,
      name,
      type: 'blur' as const, // Default type, will be inferred from primitives
      category: 'basic' as const,
      primitives,
      filterAttributes: {
        ...(node.getAttribute('x') ? { x: node.getAttribute('x') ?? '0%' } : {}),
        ...(node.getAttribute('y') ? { y: node.getAttribute('y') ?? '0%' } : {}),
        ...(node.getAttribute('width') ? { width: node.getAttribute('width') ?? '100%' } : {}),
        ...(node.getAttribute('height') ? { height: node.getAttribute('height') ?? '100%' } : {}),
      },
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
  init: (context) => {
    const filterState = context.store.getState() as CanvasStore & LibraryFiltersSlice;
    const addLibraryFilter = filterState.addLibraryFilter;
    if (!addLibraryFilter) {
      return;
    }

    if ((filterState.libraryFilters ?? []).length > 0) {
      return;
    }

    FILTER_PRESETS.forEach((preset) => {
      addLibraryFilter(preset.createFilter());
    });
  },
  relatedPluginPanels: [
    {
      id: 'filters',
      targetPlugin: 'library',
      component: FiltersPanel,
      order: 6,
    },
  ],
};
