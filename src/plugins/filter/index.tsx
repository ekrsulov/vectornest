import type { PluginDefinition, PluginSliceFactory, SvgDefsEditor } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Sparkle } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { createFilterSlice, type FilterSlice } from './slice';
import type { FilterDefinition, FilterType } from './filters';
import { buildFilterDefinition } from './filters';
import { useCanvasStore } from '../../store/canvasStore';
import { createSelectModePanel } from '../../utils/pluginFactories';
import { paintContributionRegistry } from '../../utils/paintContributionRegistry';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { collectUsedFilterIds, renderFilterDefs as computeFilterDefs, serializeFilterDefs } from './utils';
import './importContribution';
import { generateShortId } from '../../utils/idGenerator';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('filter', ['filters', 'importedFilters'], 'persist');

const filterSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createFilterSlice(set as any, get as any, api as any);
  return { state: slice };
};

const filterDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'filters-editor',
  appliesTo: (node) => {
    if (!node.isDefs) return false;
    if (node.tagName === 'filter') return true;
    return Boolean(node.defsOwnerId);
  },
  update: () => false,
  removeChild: ({ store, node }) => {
    const filterState = store as unknown as FilterSlice;
    const filter = Object.values(filterState.filters ?? {}).find((f) => f.id === (node.defsOwnerId ?? node.idAttribute));
    const upsertFilter = filterState.upsertFilter;
    const removeFilter = filterState.removeFilter;
    if (!filter) return false;

    // Delete entire filter definition
    if (node.tagName === 'filter') {
      removeFilter?.(filter.id);
      return true;
    }

    // If we don't have a concrete child index (likely an animation node), remove the whole filter
    if (node.childIndex === undefined) {
      removeFilter?.(filter.id);
      return true;
    }

    if (typeof DOMParser === 'undefined') return false;
    const parser = new DOMParser();
    const doc = parser.parseFromString(filter.svg, 'image/svg+xml');
    const filterEl = doc.querySelector('filter');
    if (!filterEl) return false;
    const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
    const children = Array.from(filterEl.children).filter((el) => !ANIMATION_TAGS.has(el.tagName.toLowerCase()));
    if (node.childIndex === undefined || node.childIndex < 0 || node.childIndex >= children.length) return false;
    const target = children[node.childIndex];
    target.parentElement?.removeChild(target);
    const nextSvg = filterEl.outerHTML;
    upsertFilter?.({ ...filter, svg: nextSvg });
    return true;
  },
  revisionSelector: (state) => (state as unknown as FilterSlice).filters,
};

const applyFilterToSelection = (
  type: FilterType,
  value: number,
  store: CanvasStore & FilterSlice
) => {
  const def = buildFilterDefinition(type, value);
  store.upsertFilter(def);
  store.selectedIds.forEach(id => {
    const el = store.elements.find(e => e.id === id);
    if (!el) return;
    const data = (el as { data?: { filterId?: string } }).data;
    if (!data) return;
    store.updateElement?.(id, { data: { ...data, filterId: def.id } });
  });
};

const importFilterDefs = (doc: Document): Record<string, FilterDefinition[]> | null => {
  const nodes = Array.from(doc.querySelectorAll('filter'));
  if (!nodes.length) return null;
  const defs = nodes.map((node) => {
    const id = node.getAttribute('id') ?? generateShortId('flt');
    return {
      id,
      // Preserve the exact SVG definition from imports so filters render according to the SVG spec
      type: 'custom' as FilterType,
      value: 50,
      svg: node.outerHTML,
    };
  });
  return { filter: defs };
};

const extractFilterIdFromValue = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const match = raw.match(/url\(\s*#([^)]+)\)/i);
  return match?.[1];
};

const extractFilterId = (element: Element): string | undefined => {
  // Prefer explicit attribute
  const direct = extractFilterIdFromValue(element.getAttribute('filter'));
  if (direct) return direct;

  // Parse inline style into key/value pairs so we only read the `filter` declaration
  const styleAttr = element.getAttribute('style');
  if (!styleAttr) return undefined;

  const styleMap = styleAttr.split(';').reduce<Record<string, string>>((acc, decl) => {
    const [k, v] = decl.split(':').map((s) => s?.trim()).filter(Boolean);
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  return extractFilterIdFromValue(styleMap.filter);
};

export const filterPlugin: PluginDefinition<CanvasStore> = {
  id: 'filter',
  metadata: {
    label: 'Filter',
    icon: Sparkle,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    selectionMode: 'elements',
  }),
  contextMenuActions: [
    {
      id: 'filter-submenu',
      action: (_ctx) => {
        const store = useCanvasStore.getState() as unknown as CanvasStore & FilterSlice;
        if (store.selectedIds.length === 0) return null;
        const submenu = (['blur', 'glow', 'shadow', 'wave'] as FilterType[]).map((type) => ({
          id: `filter-${type}`,
          label: type.charAt(0).toUpperCase() + type.slice(1),
          icon: Sparkle,
          onClick: () => applyFilterToSelection(type, 50, store),
        }));
        return {
          id: 'filter-submenu',
          label: 'Filters',
          icon: Sparkle,
          submenu,
        };
      },
    },
  ],
  sidebarPanels: [
    createSelectModePanel('filter', FilterPanel,
      () => {
        const selectedIds = useCanvasStore.getState().selectedIds;
        return selectedIds.length > 0;
      }
    ),
  ],
  slices: [filterSliceFactory],
  svgDefsEditors: [filterDefsEditor],
  importDefs: importFilterDefs,
  styleAttributeExtractor: (element) => {
    const filterId = extractFilterId(element);
    return filterId ? { filterId } : {};
  },
};

function FilterDefsContent({ state, used }: { state: FilterSlice; used: Set<string> }) {
  return <>{computeFilterDefs(state, used)}</>;
}

paintContributionRegistry.register({
  id: 'filters',
  label: 'Filters',
  showInPicker: false,
  renderPicker: () => null,
  renderDefs: () => {
    const state = useCanvasStore.getState() as unknown as CanvasStore & FilterSlice;
    const used = collectUsedFilterIds(state.elements);
    return <FilterDefsContent state={state} used={used} />;
  },
  serializeDefs: (state) => {
    const filterState = state as unknown as CanvasStore & FilterSlice;
    const used = collectUsedFilterIds(filterState.elements);
    return serializeFilterDefs(filterState, used);
  },
});

defsContributionRegistry.register({
  id: 'filters',
  collectUsedIds: (elements) => collectUsedFilterIds(elements),
  renderDefs: (state, used) => {
    const filterState = state as unknown as CanvasStore & FilterSlice;
    return <FilterDefsContent state={filterState} used={used} />;
  },
  serializeDefs: (state, used) => {
    const filterState = state as unknown as CanvasStore & FilterSlice;
    return serializeFilterDefs(filterState, used);
  },
});

