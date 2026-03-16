import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import type { SvgStructureNodeSnapshot } from '../../types/plugins';
import type { AnimationPluginSlice } from '../animationSystem/types';
import type { MarkersSlice } from '../markers/slice';
import type { PatternsSlice } from '../patterns/slice';
import type { MasksSlice } from '../masks/types';
import type { GradientsSlice } from '../gradients/slice';
import type { FilterSlice } from '../filter/slice';
import type { ClippingPluginSlice } from '../clipping/slice';
import type { SymbolPluginSlice } from '../symbols/slice';
import { PATH_DECIMAL_PRECISION } from '../../constants';
import { buildElementMap } from '../../utils/elementMapUtils';
import { formatToPrecision } from '../../utils/numberUtils';
import { getReferencedIds } from '../../utils/referenceUtils';
import type { SvgTreeNode, AnimatedElementSummary, ReferencedElementData } from './svgStructureTypes';

export const ROW_SPACING = 0;
export const LAST_OPEN_NODE_KEY = 'svg-structure:last-open-node';
export const TREE_INDENT_PX = 6;
export const TREE_GUIDE_WIDTH_PX = 1;
export const TREE_ROW_TOP_PADDING_PX = 6;
export const TREE_THUMBNAIL_SIZE_PX = 26;
export const TREE_CONNECTOR_CENTER_PX = TREE_ROW_TOP_PADDING_PX + (TREE_THUMBNAIL_SIZE_PX / 2);

export const textProps = {
  fontSize: '12px',
  color: 'gray.600',
  _dark: { color: 'gray.400' },
};

export const DEF_CONTAINER_TAGS = new Set([
  'lineargradient',
  'radialgradient',
  'pattern',
  'mask',
  'marker',
  'filter',
  'clippath',
  'symbol',
]);

export const ANIMATION_TAGS = new Set([
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
]);

export const ARTBOARD_BACKGROUND_ATTR = 'data-vectornest-artboard-background';

export const DEFAULT_HIDDEN_TAGS = new Set([
  ...ANIMATION_TAGS,
  'defs',
  'def',
  'metadata',
  'tspan',
]);

// Animation tags are no longer skipped - they can be viewed and edited
export const SKIPPED_TAGS = new Set<string>();

export const getReferencedElementData = (element?: CanvasElement): ReferencedElementData => {
  return (element?.data ?? {}) as ReferencedElementData;
};

export const isArtboardBackgroundRectNode = (el: Element, tagName: string): boolean => {
  if (tagName !== 'rect') {
    return false;
  }

  return Array.from(el.attributes).some((attr) => (
    attr.name.toLowerCase() === ARTBOARD_BACKGROUND_ATTR &&
    attr.value.trim().toLowerCase() === 'true'
  ));
};

/** Maximum length before an element id is truncated in the structure tree. */
const MAX_DISPLAY_ID_LENGTH = 13;
/** Number of trailing characters to keep when truncating a long id. */
const DISPLAY_ID_SUFFIX_LENGTH = 6;

export const formatDisplayId = (
  idValue: string | null | undefined,
  idType: 'id' | 'data' | 'attr' | null,
  fallback: string
): string => {
  if (!idValue) return fallback;

  // Only shorten very long ids; keep shorter ids as-is
  if (idValue.length >= MAX_DISPLAY_ID_LENGTH) {
    const suffix = idValue.slice(-DISPLAY_ID_SUFFIX_LENGTH);
    const prefix = idType ?? 'id';
    return `${prefix}-${suffix}`;
  }

  return idValue;
};

export const truncateValue = (value: string, max = 24): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

export const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return formatToPrecision(value, PATH_DECIMAL_PRECISION).toString();
};

export const toSnapshot = (node: SvgTreeNode): SvgStructureNodeSnapshot => ({
  tagName: node.tagName,
  idAttribute: node.idAttribute,
  dataElementId: node.dataElementId,
  displayId: node.displayId,
  elementId: node.canvasElement?.id ?? node.dataElementId ?? node.idAttribute ?? null,
  isDefs: node.isDefs,
  defsOwnerId: node.defsOwnerId ?? node.idAttribute,
  childIndex: node.childIndex,
  attributes: node.attributes,
});

export const findNodeByKey = (node: SvgTreeNode, key: string): SvgTreeNode | null => {
  if (node.key === key) {
    return node;
  }

  for (const child of node.children) {
    const match = findNodeByKey(child, key);
    if (match) {
      return match;
    }
  }

  return null;
};

export const collectCanvasElementIdsFromNode = (node: SvgTreeNode, acc: Set<string>): void => {
  const elementId = node.canvasElement?.id ?? node.dataElementId ?? null;
  if (elementId) {
    acc.add(elementId);
  }

  node.children.forEach((child) => collectCanvasElementIdsFromNode(child, acc));
};

export const hasTrackedElementsChanged = (
  previousState: CanvasStore,
  nextState: CanvasStore,
  trackedIds: Set<string>
): boolean => {
  if (trackedIds.size === 0) {
    return false;
  }

  const previousById = new Map(previousState.elements.map((element) => [element.id, element]));
  const nextById = new Map(nextState.elements.map((element) => [element.id, element]));

  for (const id of trackedIds) {
    if (previousById.get(id) !== nextById.get(id)) {
      return true;
    }
  }

  return false;
};

export const selectAnimatedElementSummary = (state: CanvasStore): AnimatedElementSummary => {
  const animations = (state as CanvasStore & AnimationPluginSlice).animations ?? [];
  const elements = state.elements ?? [];
  const elementMap = buildElementMap(elements);
  const direct = new Set<string>();
  const indirect = new Set<string>();

  animations.forEach((anim) => {
    if (anim.targetElementId && elementMap.has(anim.targetElementId)) {
      direct.add(anim.targetElementId);
    }
  });

  elements.forEach((element) => {
    const referencedIds = getReferencedIds(element);
    if (referencedIds.length === 0) {
      return;
    }

    const referencedIdSet = new Set(referencedIds);

    for (const anim of animations) {
      if (anim.targetElementId === element.id) {
        continue;
      }

      const matchesReferencedTarget =
        referencedIdSet.has(anim.targetElementId) ||
        (anim.gradientTargetId ? referencedIdSet.has(anim.gradientTargetId) : false) ||
        (anim.patternTargetId ? referencedIdSet.has(anim.patternTargetId) : false) ||
        (anim.clipPathTargetId ? referencedIdSet.has(anim.clipPathTargetId) : false) ||
        (anim.filterTargetId ? referencedIdSet.has(anim.filterTargetId) : false) ||
        (anim.maskTargetId ? referencedIdSet.has(anim.maskTargetId) : false) ||
        (anim.markerTargetId ? referencedIdSet.has(anim.markerTargetId) : false) ||
        (anim.symbolTargetId ? referencedIdSet.has(anim.symbolTargetId) : false);

      if (matchesReferencedTarget) {
        indirect.add(element.id);
        break;
      }

      const isTransitive = Boolean(
        anim.gradientTargetId ||
          anim.patternTargetId ||
          anim.clipPathTargetId ||
          anim.filterTargetId ||
          anim.maskTargetId ||
          anim.markerTargetId ||
          anim.symbolTargetId
      );

      if (isTransitive && anim.previewElementId === element.id) {
        indirect.add(element.id);
        break;
      }
    }
  });

  return {
    directAnimatedElementIdsKey: Array.from(direct).sort().join('\u0001'),
    indirectAnimatedElementIdsKey: Array.from(indirect).sort().join('\u0001'),
  };
};

export const fallbackDeleteDefsNode = (node: SvgStructureNodeSnapshot, store: CanvasStore): boolean => {
  const defsId = node.defsOwnerId ?? node.idAttribute ?? null;
  if (!node.isDefs || !defsId) return false;

  // Try each defs slice if available
  const markersStore = store as CanvasStore & Partial<MarkersSlice>;
  if (markersStore.removeMarker) {
    const exists = (markersStore.markers ?? []).some((m) => m.id === defsId);
    if (exists) {
      markersStore.removeMarker(defsId);
      return true;
    }
  }

  const patternsStore = store as CanvasStore & Partial<PatternsSlice>;
  if (patternsStore.removePattern) {
    const exists = (patternsStore.patterns ?? []).some((p) => p.id === defsId);
    if (exists) {
      patternsStore.removePattern(defsId);
      return true;
    }
  }

  const masksStore = store as CanvasStore & Partial<MasksSlice>;
  if (masksStore.removeMask) {
    const exists = (masksStore.masks ?? []).some((m) => m.id === defsId);
    if (exists) {
      masksStore.removeMask(defsId);
      return true;
    }
  }

  const gradientsStore = store as CanvasStore & Partial<GradientsSlice>;
  if (gradientsStore.removeGradient) {
    const exists = (gradientsStore.gradients ?? []).some((g) => g.id === defsId);
    if (exists) {
      gradientsStore.removeGradient(defsId);
      return true;
    }
  }

  const filterStore = store as CanvasStore & Partial<FilterSlice>;
  if (filterStore.removeFilter) {
    const exists = Object.values(filterStore.filters ?? {}).some((f) => f.id === defsId);
    if (exists) {
      filterStore.removeFilter(defsId);
      return true;
    }
  }

  const clipStore = store as CanvasStore & Partial<ClippingPluginSlice>;
  if (clipStore.removeClip) {
    const exists = (clipStore.clips ?? []).some((c) => c.id === defsId);
    if (exists) {
      clipStore.removeClip(defsId);
      return true;
    }
  }

  const symbolStore = store as CanvasStore & Partial<SymbolPluginSlice>;
  if (symbolStore.removeSymbol) {
    const exists = (symbolStore.symbols ?? []).some((s) => s.id === defsId || `symbol-${s.id}` === defsId);
    if (exists) {
      symbolStore.removeSymbol(defsId.replace(/^symbol-/, ''));
      return true;
    }
  }

  return false;
};
