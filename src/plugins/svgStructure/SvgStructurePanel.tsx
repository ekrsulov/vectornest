import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Checkbox,
  IconButton,
} from '@chakra-ui/react';
import {
  MoreVertical,
} from 'lucide-react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import type { PanelComponentProps } from '../../types/panel';
import { useSidebarPanelState } from '../../contexts/sidebarPanelState';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, Command, GroupElement, PathData } from '../../types';
import type { MarkersSlice } from '../markers/slice';
import type { PatternsSlice } from '../patterns/slice';
import type { SvgStructureSlice } from './slice';
import type { MasksSlice } from '../masks/types';
import type { GradientsSlice } from '../gradients/slice';
import type { FilterSlice } from '../filter/slice';
import type { ClippingPluginSlice } from '../clipping/slice';
import type { SymbolPluginSlice } from '../symbols/slice';
import type { AnimationPluginSlice } from '../animationSystem/types';
import { buildElementMap, formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { pluginManager } from '../../utils/pluginManager';
import type { RegisteredSvgDefsEditor } from '../../utils/svgDefsEditorRegistry';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { useFrozenCanvasStoreValueDuringDrag, useFrozenElementsDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { PathThumbnail } from '../../ui/PathThumbnail';
import { ExportManager } from '../../utils/export/ExportManager';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { getReferencedIds } from '../../utils/referenceUtils';
import {
  buildNativeShapeThumbnailCommands,
  getGroupThumbnailCommands,
  getItemThumbnailData,
} from '../../utils/selectPanelHelpers';
import type {
  SvgStructureAttributeSnapshot,
  SvgStructureContributionProps as SvgStructureContributionPropsType,
  SvgStructureNodeSnapshot,
  SvgDefsEditor,
} from '../../types/plugins';
import type { RegisteredSvgStructureContribution } from '../../utils/svgStructureContributionRegistry';
import type { UiSlice } from '../../store/slices/uiSlice';
import { useThemeColors } from '../../hooks';
interface SvgTreeNode {
  key: string;
  numberPath: string | null;
  tagName: string;
  idAttribute?: string | null;
  dataElementId?: string | null;
  displayId: string;
  isDefs: boolean;
  defsOwnerId?: string | null;
  childIndex?: number;
  attributes: SvgStructureAttributeSnapshot[];
  children: SvgTreeNode[];
  canvasElement?: CanvasElement;
}

const ROW_SPACING = 2;
const LAST_OPEN_NODE_KEY = 'svg-structure:last-open-node';

const textProps = {
  fontSize: '12px',
  color: 'gray.600',
  _dark: { color: 'gray.400' },
};

const DEF_CONTAINER_TAGS = new Set([
  'lineargradient',
  'radialgradient',
  'pattern',
  'mask',
  'marker',
  'filter',
  'clippath',
  'symbol',
]);

const ANIMATION_TAGS = new Set([
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
]);
const ARTBOARD_BACKGROUND_ATTR = 'data-vectornest-artboard-background';
const DEFAULT_HIDDEN_TAGS = new Set([
  ...ANIMATION_TAGS,
  'defs',
  'def',
  'metadata',
  'tspan',
]);

type AnimationTargetKey =
  | `def:gradient:${string}`
  | `def:pattern:${string}`
  | `def:marker:${string}`
  | `def:clippath:${string}`
  | `def:mask:${string}`
  | `def:filter:${string}`
  | `def:symbol:${string}`
  | `child:stop:${string}:${number}`
  | `child:pattern:${string}:${number}`
  | `child:marker:${string}:${number}`
  | `child:clippath:${string}:${number}`
  | `child:mask:${string}:${number}`
  | `child:filter:${string}:${number}`
  | `child:symbol:${string}:${number}`;

// Animation tags are no longer skipped - they can be viewed and edited
const SKIPPED_TAGS = new Set<string>();

const isArtboardBackgroundRectNode = (el: Element, tagName: string): boolean => {
  if (tagName !== 'rect') {
    return false;
  }

  return Array.from(el.attributes).some((attr) => (
    attr.name.toLowerCase() === ARTBOARD_BACKGROUND_ATTR &&
    attr.value.trim().toLowerCase() === 'true'
  ));
};

const formatDisplayId = (
  idValue: string | null | undefined,
  idType: 'id' | 'data' | 'attr' | null,
  fallback: string
): string => {
  if (!idValue) return fallback;

  // Only shorten very long ids (13+ chars); keep shorter ids as-is
  if (idValue.length >= 13) {
    const suffix = idValue.slice(-6);
    const prefix = idType ?? 'id';
    return `${prefix}-${suffix}`;
  }

  return idValue;
};

const truncateValue = (value: string, max = 24): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};



const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return formatToPrecision(value, PATH_DECIMAL_PRECISION).toString();
};

const toSnapshot = (node: SvgTreeNode): SvgStructureNodeSnapshot => ({
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

const fallbackDeleteDefsNode = (node: SvgStructureNodeSnapshot, store: CanvasStore): boolean => {
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

interface SvgNodeRowProps {
  node: SvgTreeNode;
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  detailExpandedKeys: Set<string>;
  onToggleDetails: (key: string) => void;
  attributeExpandedKeys: Set<string>;
  onToggleAttributes: (key: string) => void;
  contributions: RegisteredSvgStructureContribution[];
  elements: CanvasElement[];
  elementMap: Map<string, CanvasElement>;
  storeApi: SvgStructureContributionPropsType['store'];
  hiddenElementIds: Set<string>;
  lockedElementIds: Set<string>;
  highlightedIds: Set<string>;
  defsEditors: RegisteredSvgDefsEditor[];
  animationTargets: Set<AnimationTargetKey>;
  referencedDefs: Set<string>;
  isVirtualShiftActive: boolean;
  selectedIds: string[];
  setHoveredStructureElementId: (id: string | null) => void;
}

const SvgNodeRow: React.FC<SvgNodeRowProps> = ({
  node,
  expandedKeys,
  onToggle,
  detailExpandedKeys,
  onToggleDetails,
  attributeExpandedKeys,
  onToggleAttributes,
  contributions,
  elements,
  elementMap,
  storeApi,
  hiddenElementIds,
  lockedElementIds,
  highlightedIds,
  defsEditors,
  animationTargets,
  referencedDefs,
  isVirtualShiftActive,
  selectedIds,
  setHoveredStructureElementId,
}) => {
  const isExpanded = true;
  const isDetailsExpanded = detailExpandedKeys.has(node.key);
  const isSvgRoot = node.tagName === 'svg';

  const [openAttributeEditor, setOpenAttributeEditor] = useState<{ name: string; value: string } | null>(null);
  const [newAttribute, setNewAttribute] = useState<{ name: string; value: string }>({ name: '', value: '' });

  const elementId = useMemo(
    () => node.dataElementId ?? node.idAttribute ?? node.canvasElement?.id,
    [node.canvasElement?.id, node.dataElementId, node.idAttribute]
  );

  const isHidden = useMemo(() => {
    if (!elementId) return false;
    return hiddenElementIds.has(elementId);
  }, [elementId, hiddenElementIds]);

  const isLocked = useMemo(() => {
    if (!elementId) return false;
    return lockedElementIds.has(elementId);
  }, [elementId, lockedElementIds]);

  const showDetails = isDetailsExpanded && !isSvgRoot;

  const numberLabel = node.numberPath;

  const fullId = useMemo(() => node.idAttribute ?? node.dataElementId ?? node.displayId, [node.dataElementId, node.displayId, node.idAttribute]);

  const nodeSnapshot = useMemo(() => ({
    ...toSnapshot(node),
    childIndex: node.childIndex,
  }), [node]);

  const defsEditor = useMemo(() =>
    defsEditors
      .map((entry) => entry.editor)
      .find((ed) => ed.appliesTo(nodeSnapshot)),
    [defsEditors, nodeSnapshot]);

  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(node.isDefs && node.defsOwnerId && node.childIndex !== undefined && !isDefContainerTag);
  const defsOwnerId = node.defsOwnerId ?? node.idAttribute ?? null;

  const isReferencedDefsNode = useMemo(() => {
    if (!node.isDefs || !defsOwnerId) return false;
    const parentReferenced = referencedDefs.has(defsOwnerId);

    // If the parent def is used anywhere, treat all its nodes as referenced
    if (parentReferenced) return true;

    // Animations targeting defs elements
    if (node.childIndex === undefined && node.idAttribute && isDefContainerTag) {
      const tag = node.tagName.toLowerCase();
      const key = (() => {
        if (tag === 'lineargradient' || tag === 'radialgradient') return `def:gradient:${defsOwnerId}` as const;
        if (tag === 'pattern') return `def:pattern:${defsOwnerId}` as const;
        if (tag === 'marker') return `def:marker:${defsOwnerId}` as const;
        if (tag === 'clippath') return `def:clippath:${defsOwnerId}` as const;
        if (tag === 'mask') return `def:mask:${defsOwnerId}` as const;
        if (tag === 'filter') return `def:filter:${defsOwnerId}` as const;
        if (tag === 'symbol') return `def:symbol:${defsOwnerId}` as const;
        return null;
      })();

      return key ? animationTargets.has(key) : false;
    }

    // Animations targeting defs children
    if (isDefsChild && node.childIndex !== undefined) {
      const index = node.childIndex;
      const tag = node.tagName.toLowerCase();

      if (tag === 'stop' && animationTargets.has(`child:stop:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:pattern:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:symbol:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:filter:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:marker:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:clippath:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:mask:${defsOwnerId}:${index}`)) return true;

      return false;
    }

    return false;
  }, [animationTargets, defsOwnerId, isDefContainerTag, isDefsChild, node.childIndex, node.idAttribute, node.isDefs, node.tagName, referencedDefs]);

  const isDeleteDisabled = useMemo(() => {
    if (!node.isDefs) return false;
    return isReferencedDefsNode;
  }, [isReferencedDefsNode, node.isDefs]);

  const baseMapAttributeNameToDataKey = useCallback((attrName: string, current: Record<string, unknown>): string => {
    const normalized = attrName.toLowerCase();
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());

    const explicitMap: Record<string, string> = {
      fill: 'fillColor',
      stroke: 'strokeColor',
      'stroke-width': 'strokeWidth',
      'stroke-opacity': 'strokeOpacity',
      'fill-opacity': 'fillOpacity',
      opacity: 'opacity',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
      'stroke-dasharray': 'strokeDasharray',
      'stroke-dashoffset': 'strokeDashoffset',
      'stroke-miterlimit': 'strokeMiterlimit',
      'vector-effect': 'vectorEffect',
      'shape-rendering': 'shapeRendering',
      'mix-blend-mode': 'mixBlendMode',
      transform: 'transform',
      // Gradient / marker common fields
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      cx: 'cx',
      cy: 'cy',
      r: 'r',
      fx: 'fx',
      fy: 'fy',
      angle: 'angle',
      'gradient-units': 'gradientUnits',
      gradientunits: 'gradientUnits',
      'gradient-transform': 'gradientTransform',
      gradienttransform: 'gradientTransform',
      'spread-method': 'spreadMethod',
      spreadmethod: 'spreadMethod',
      href: 'href',
      'xlink:href': 'href',
      'marker-width': 'markerWidth',
      markerwidth: 'markerWidth',
      'marker-height': 'markerHeight',
      markerheight: 'markerHeight',
      'ref-x': 'refX',
      refx: 'refX',
      'ref-y': 'refY',
      refy: 'refY',
      orient: 'orient',
    };

    const mapped = explicitMap[normalized];
    if (mapped) return mapped;
    if (camel in current) return camel;
    return normalized;
  }, []);

  const mapAttributeNameToDataKey = useCallback((attrName: string, current: Record<string, unknown>, editor?: SvgDefsEditor<CanvasStore>): string => {
    if (editor?.mapAttributeNameToDataKey) {
      return editor.mapAttributeNameToDataKey(attrName, current);
    }
    return baseMapAttributeNameToDataKey(attrName, current);
  }, [baseMapAttributeNameToDataKey]);

  const matchingContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const matchingBadgeContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => contribution.badgesComponent && (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const matchingButtonContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => contribution.buttonsComponent && (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const pluginThumbnail = useMemo(() => {
    if (!node.canvasElement) return null;
    const contribution = elementContributionRegistry.getContribution(node.canvasElement.type);
    return (
      contribution?.renderThumbnail?.(node.canvasElement, {
        viewport: { zoom: 1, panX: 0, panY: 0 },
        elementMap,
      }) ?? null
    );
  }, [node.canvasElement, elementMap]);

  const isHighlighted = elementId ? highlightedIds.has(elementId) : false;

  const thumbnailCommands = useMemo<Command[]>(() => {
    if (!node.canvasElement) return [];
    if (node.canvasElement.type === 'path') {
      const { commands } = getItemThumbnailData('element', node.canvasElement.data as never);
      return commands as Command[];
    }
    if (node.canvasElement.type === 'group') {
      const childIds = (node.canvasElement.data as { childIds?: string[] }).childIds;
      return getGroupThumbnailCommands(childIds, elements) as Command[];
    }
    if (node.canvasElement.type === 'nativeShape') {
      return buildNativeShapeThumbnailCommands(node.canvasElement.data as never) as Command[];
    }
    const bounds = elementContributionRegistry.getBounds(node.canvasElement, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (!bounds) return [];
    return [
      { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
      { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
      { type: 'Z' },
    ];
  }, [node.canvasElement, elements, elementMap]);

  const resolvedBbox = useMemo(() => {
    if (!node.canvasElement) return null;
    if (node.canvasElement.type === 'path') {
      const { bbox } = getItemThumbnailData('element', node.canvasElement.data as PathData);
      if (bbox) return bbox;
    }
    if (node.canvasElement.type === 'group') {
      const viewport = { zoom: 1, panX: 0, panY: 0 };
      const groupElement = node.canvasElement as GroupElement;
      const bounds = getGroupBounds(groupElement, elementMap, viewport);
      if (bounds) {
        return {
          topLeft: { x: bounds.minX, y: bounds.minY },
          bottomRight: { x: bounds.maxX, y: bounds.maxY },
        };
      }
    }
    const fallbackBounds = elementContributionRegistry.getBounds(node.canvasElement, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (!fallbackBounds) return null;
    return {
      topLeft: { x: fallbackBounds.minX, y: fallbackBounds.minY },
      bottomRight: { x: fallbackBounds.maxX, y: fallbackBounds.maxY },
    };
  }, [elementMap, node.canvasElement]);

  const detailBbox = resolvedBbox
    ? {
      width: resolvedBbox.bottomRight.x - resolvedBbox.topLeft.x,
      height: resolvedBbox.bottomRight.y - resolvedBbox.topLeft.y,
      topLeft: resolvedBbox.topLeft,
      bottomRight: resolvedBbox.bottomRight,
    }
    : null;

  const pathPointStats = useMemo(() => {
    if (node.canvasElement?.type !== 'path') return null;

    const pointsMatch = (
      a: { x: number; y: number } | null,
      b: { x: number; y: number } | null
    ): boolean => {
      if (!a || !b) return false;
      return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    };

    const subPaths = (node.canvasElement.data as PathData).subPaths ?? [];
    let totalPoints = 0;
    let curvePoints = 0;
    let linePoints = 0;

    for (const subPath of subPaths) {
      const firstCommand = subPath[0];
      const firstPoint =
        firstCommand && (firstCommand.type === 'M' || firstCommand.type === 'L' || firstCommand.type === 'C')
          ? firstCommand.position
          : null;

      const lastPoint = (() => {
        for (let index = subPath.length - 1; index >= 0; index -= 1) {
          const command = subPath[index];
          if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
            return command.position;
          }
        }
        return null;
      })();

      const firstPointEqualsLastPoint = pointsMatch(firstPoint, lastPoint);
      const closingZIndex = subPath.findIndex((command) => command.type === 'Z');
      const lastPointBeforeZ = (() => {
        if (closingZIndex === -1) return null;
        for (let index = closingZIndex - 1; index >= 0; index -= 1) {
          const command = subPath[index];
          if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
            return command.position;
          }
        }
        return null;
      })();
      const zClosesOpenPath = Boolean(
        closingZIndex !== -1 &&
        firstPoint &&
        lastPointBeforeZ &&
        !pointsMatch(firstPoint, lastPointBeforeZ)
      );

      for (let index = 0; index < subPath.length; index += 1) {
        const command = subPath[index];
        if (command.type === 'C') {
          curvePoints += 1;
          totalPoints += 1;
          continue;
        }

        if (command.type === 'L') {
          linePoints += 1;
          totalPoints += 1;
          continue;
        }

        if (command.type === 'Z') {
          if (index === closingZIndex && zClosesOpenPath) {
            linePoints += 1;
            totalPoints += 1;
          }
          continue;
        }

        if (command.type === 'M') {
          if (index === 0 && (firstPointEqualsLastPoint || zClosesOpenPath)) {
            continue;
          }

          const nextDrawableCommand = subPath
            .slice(index + 1)
            .find((nextCommand) => nextCommand.type === 'C' || nextCommand.type === 'L');

          if (nextDrawableCommand?.type === 'C') {
            curvePoints += 1;
          } else {
            linePoints += 1;
          }

          totalPoints += 1;
        }
      }
    }

    return { totalPoints, curvePoints, linePoints };
  }, [node.canvasElement]);

  const referencedDetails = useMemo(() => {
    if (!node.canvasElement) return [];
    const refs: Array<{ id: string; type: string }> = [];
    const seen = new Set<string>();
    const data = node.canvasElement.data || {};

    const addRef = (id: string | null | undefined, type: string) => {
      if (!id) return;
      const match = id.match(/url\\(#([^)]+)\\)/);
      const cleanId = match ? match[1] : id.startsWith('#') ? id.slice(1) : id;
      if (!cleanId) return;
      const key = `${type}:${cleanId}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push({ id: cleanId, type });
    };

    const idFields: Array<[keyof typeof data, string]> = [
      ['clipPathId', 'CLIPPATH'],
      ['maskId', 'MASK'],
      ['filterId', 'FILTER'],
      ['markerStart', 'MARKER'],
      ['markerMid', 'MARKER'],
      ['markerEnd', 'MARKER'],
    ];
    idFields.forEach(([field, type]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (data as any)[field];
      if (typeof value === 'string') addRef(value, type);
    });

    const paintFields: Array<keyof typeof data> = ['fillColor', 'strokeColor'];
    paintFields.forEach((field) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (data as any)[field];
      if (typeof value === 'string' && value.includes('url(')) addRef(value, 'PAINT');
    });

    // href / xlink:href
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const href = (data as any)['href'] || (data as any)['xlink:href'];
    if (typeof href === 'string') addRef(href, 'SYMBOL');

    // textPath href
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tp = (data as any).textPath;
    if (tp && typeof tp === 'object' && typeof tp.href === 'string') {
      addRef(tp.href, 'PATH');
    }

    return refs;
  }, [node.canvasElement]);

  const typeLetter = useMemo(() => {
    if (node.tagName) return node.tagName.charAt(0).toUpperCase();
    if (node.canvasElement?.type) return node.canvasElement.type.charAt(0).toUpperCase();
    return '';
  }, [node.canvasElement?.type, node.tagName]);

  const renderContribution = (entry: RegisteredSvgStructureContribution) => {
    const ContributionComponent = entry.contribution.component as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <ContributionComponent
        key={`${node.key}-${entry.contribution.id}`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  const renderBadgeContribution = (entry: RegisteredSvgStructureContribution) => {
    const BadgeComponent = entry.contribution.badgesComponent as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <BadgeComponent
        key={`${node.key}-${entry.contribution.id}-badge`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  const renderButtonContribution = (entry: RegisteredSvgStructureContribution) => {
    const ButtonsComponent = entry.contribution.buttonsComponent as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <ButtonsComponent
        key={`${node.key}-${entry.contribution.id}-buttons`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  return (
    <VStack
      spacing={ROW_SPACING}
      align="stretch"
      px={0}
      data-node-key={node.key}
    >
      <VStack spacing={0} align="stretch" px={0}>
        <HStack
          spacing={1}
          align="center"
          pr={0}
          py={0}
        >
          <Box
            width="26px"
            height="26px"
            borderRadius="md"
            borderWidth="1px"
            borderColor={isHighlighted ? 'yellow.400' : 'border.subtle'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="bg.subtle"
            overflow="hidden"
            flexShrink={0}
            cursor={node.attributes.length > 0 ? 'pointer' : 'default'}
            onClick={node.attributes.length > 0 ? () => onToggleAttributes(node.key) : undefined}
            onMouseEnter={() => {
              if (elementId) {
                setHoveredStructureElementId(elementId);
              }
            }}
            onMouseLeave={() => {
              setHoveredStructureElementId(null);
            }}
          >
            {pluginThumbnail ? (
              pluginThumbnail
            ) : thumbnailCommands.length > 0 ? (
              <PathThumbnail commands={thumbnailCommands} />
            ) : (
              <Text
                fontSize="14px"
                fontWeight="bold"
                color="gray.500"
                _dark={{ color: 'gray.300' }}
                textTransform="uppercase"
                width="100%"
                textAlign="center"
                lineHeight="1"
              >
                {typeLetter}
              </Text>
            )}
          </Box>

          <VStack
            spacing={0.25}
            align="stretch"
            flex={1}
            minWidth={0}
            pr={0}
            py={0}
          >
            <HStack spacing={1} align="center" minWidth={0} width="100%">
              <HStack
                spacing={1}
                align="center"
                minWidth={0}
                flexShrink={1}
                flex={1}
                onClick={() => onToggleDetails(node.key)}
                cursor="pointer"
              >
                {numberLabel && (
                  <Text {...textProps} fontWeight="600" fontSize="xs" noOfLines={1} flexShrink={0}>
                    {numberLabel}
                  </Text>
                )}
                <Text {...textProps} fontWeight="600" fontSize="xs" noOfLines={1} flexShrink={1} minWidth={0}>
                  {node.displayId}
                </Text>
              </HStack>

              <HStack spacing={1} align="center" justify="flex-end" flexShrink={0} flexWrap="wrap">
                <Badge variant="subtle" colorScheme="gray" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                  {node.tagName}
                </Badge>
                {node.isDefs && <Badge colorScheme="purple" fontSize="2xs" px={1} py={0.5}>D</Badge>}
                {node.dataElementId && !node.idAttribute && (
                  <Badge colorScheme="blue" fontSize="2xs" px={1} py={0.5}>data-id</Badge>
                )}
                {matchingBadgeContributions.map(renderBadgeContribution)}
                {node.children.length > 0 && (
                  <Badge variant="outline" colorScheme="gray" fontSize="2xs" px={1} py={0.5} borderRadius="sm">
                    {node.children.length}
                  </Badge>
                )}
              </HStack>
            </HStack>
          </VStack>
        </HStack>

        {showDetails && (() => {
          const showIdSection = fullId && (fullId !== node.displayId || fullId.length >= 13);
          const showDimensions = detailBbox !== null;
          const showPathPoints = pathPointStats !== null;
          const showReferences = referencedDetails.length > 0;
          const hasSectionAbovePathPoints = showIdSection || showDimensions;
          const hasSectionAboveReferences = hasSectionAbovePathPoints || showPathPoints;
          const hasSectionAboveActions = hasSectionAboveReferences || showReferences;

          return (
            <VStack
              spacing={0}
              align="stretch"
              pt={hasSectionAboveReferences ? 0.25 : 0}
              pr={0}
              pl={2}
              ml={1}
              borderLeftWidth="1px"
              borderColor="border.subtle"
            >
              {showIdSection && (
                <Box width="100%" pb={2}>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>ID</Text>
                  <Text {...textProps} fontSize="xs" wordBreak="break-all" userSelect="text" fontFamily="monospace">
                    {fullId}
                  </Text>
                </Box>
              )}

              {showDimensions && (
                <Box width="100%">
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>DIMENSIONS</Text>
                  <VStack spacing={1} align="stretch">
                    <HStack spacing={3} align="start" width="100%" justify="space-between">
                      <VStack spacing={0} align="start">
                        <Text fontSize="2xs" color="gray.500">Top-Left</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.topLeft.x)},{formatValue(detailBbox.topLeft.y)}</Text>
                      </VStack>
                      <VStack spacing={0} align="end">
                        <Text fontSize="2xs" color="gray.500">Width</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.width)}</Text>
                      </VStack>
                    </HStack>
                    <HStack spacing={3} align="start" width="100%" justify="space-between">
                      <VStack spacing={0} align="start">
                        <Text fontSize="2xs" color="gray.500">Height</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.height)}</Text>
                      </VStack>
                      <VStack spacing={0} align="end">
                        <Text fontSize="2xs" color="gray.500">Bottom-Right</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.bottomRight.x)},{formatValue(detailBbox.bottomRight.y)}</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {showPathPoints && pathPointStats && (
                <Box
                  width="100%"
                  {...(hasSectionAbovePathPoints ? { pt: 2 } : { p: 0 })}
                >
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>POINTS</Text>
                  <HStack spacing={3} align="start" width="100%" justify="space-between">
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Total</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.totalPoints}</Text>
                    </VStack>
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Curves</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.curvePoints}</Text>
                    </VStack>
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Lines</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.linePoints}</Text>
                    </VStack>
                  </HStack>
                </Box>
              )}

              {showReferences && (
                <Box
                  width="100%"
                  {...(hasSectionAboveReferences ? { pt: 2 } : { p: 0 })}
                >
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>REFERENCES</Text>
                  <VStack spacing={1} align="stretch">
                    {referencedDetails.map((ref) => (
                      <HStack
                        key={`${ref.type}-${ref.id}`}
                        spacing={2}
                        justify="space-between"
                        align="center"
                      >
                        <Text fontSize="xs" fontFamily="monospace" color="gray.700" _dark={{ color: 'gray.200' }}>
                          {ref.id}
                        </Text>
                        <Badge variant="outline" colorScheme="gray" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                          {ref.type}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              <Box
                width="100%"
                {...(hasSectionAboveActions ? { pt: 2 } : { p: 0 })}
              >
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>ACTIONS</Text>
                <VStack spacing={10} align="stretch">
                  <HStack spacing={1} flexWrap="wrap">
                  {!node.isDefs && elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={(e) => {
                        if (!elementId) return;
                        const isShiftActive = e.shiftKey || isVirtualShiftActive;
                        const select = (storeApi.getState?.() as CanvasStore | undefined)?.selectElement ?? canvasStoreApi.getState().selectElement;
                        select?.(elementId, isShiftActive);
                      }}
                    >
                      Select
                    </PanelStyledButton>
                  )}

                  {elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={() => {
                        if (!elementId) return;
                        const toggle = (storeApi.getState?.() as CanvasStore | undefined)?.toggleElementVisibility ?? canvasStoreApi.getState().toggleElementVisibility;
                        toggle?.(elementId);
                      }}
                    >
                      {isHidden ? 'Show' : 'Hide'}
                    </PanelStyledButton>
                  )}

                  {elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={() => {
                        if (!elementId) return;
                        const toggle = (storeApi.getState?.() as CanvasStore | undefined)?.toggleElementLock ?? canvasStoreApi.getState().toggleElementLock;
                        toggle?.(elementId);
                      }}
                    >
                      {isLocked ? 'Unlock' : 'Lock'}
                    </PanelStyledButton>
                  )}

                  {(elementId || node.isDefs) && (
                    <PanelStyledButton
                      size="xs"
                      colorScheme="red"
                      isDisabled={isDeleteDisabled}
                      onClick={() => {
                        if (isDeleteDisabled) return;
                        const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
                        if (elementId) {
                          const remove = (storeState as CanvasStore | undefined)?.deleteElement ?? canvasStoreApi.getState().deleteElement;
                          remove?.(elementId);
                          return;
                        }
                        if (node.isDefs && defsEditor?.removeChild) {
                          const handled = defsEditor.removeChild({ store: storeState, node: nodeSnapshot });
                          if (!handled) {
                            fallbackDeleteDefsNode(nodeSnapshot, storeState);
                          }
                          setOpenAttributeEditor(null);
                          return;
                        }
                        if (node.isDefs) {
                          fallbackDeleteDefsNode(nodeSnapshot, storeState);
                          setOpenAttributeEditor(null);
                        }
                      }}
                    >
                      Delete
                    </PanelStyledButton>
                  )}
               

                  {matchingButtonContributions.map(renderButtonContribution)}
                  </HStack>
                </VStack>
              </Box>

            {node.attributes.length > 0 && attributeExpandedKeys.has(node.key) && (
              <Box
                pl={0}
                pr={0}
                py={0}
                overflowX="auto"
                whiteSpace="nowrap"
                display="flex"
                columnGap={1}
                sx={{
                  scrollbarWidth: 'none',
                  '::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {node.attributes.map((attr) => (
                  <Badge
                    key={`${node.key}-${attr.name}`}
                    variant="outline"
                    colorScheme="gray"
                    fontSize="2xs"
                    px={1.5}
                    py={0.5}
                    borderRadius="sm"
                    flexShrink={0}
                    cursor="pointer"
                    onClick={() => {
                      setOpenAttributeEditor((prev) => {
                        if (prev?.name === attr.name) return null;
                        return { name: attr.name, value: attr.value };
                      });
                    }}
                  >
                    {attr.name}="{truncateValue(attr.value, 36)}"
                  </Badge>
                ))}
              </Box>
            )}

            {openAttributeEditor && attributeExpandedKeys.has(node.key) && (
              <VStack spacing={0.5} align="stretch" pl={0} pr={1} pt={1} pb={1.5}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.300' }}>
                  {openAttributeEditor.name}
                </Text>
                <PanelTextInput
                  value={openAttributeEditor.value}
                  onChange={(val) => setOpenAttributeEditor((prev) => (prev ? { ...prev, value: val } : prev))}
                  width="100%"
                />
                <PanelStyledButton
                  size="xs"
                  onClick={() => {
                    if (!openAttributeEditor) return;
                    const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore & {
                      gradients?: { id: string }[];
                      updateGradient?: (id: string, updates: Record<string, unknown>) => void;
                      markers?: { id: string }[];
                      updateMarker?: (id: string, updates: Record<string, unknown>) => void;
                    };

                    const rawValue = openAttributeEditor.value;

                    if (node.canvasElement) {
                      const updateElement = storeState.updateElement;
                      if (!updateElement) return;
                      const current = node.canvasElement.data as Record<string, unknown>;
                      const dataKey = mapAttributeNameToDataKey(openAttributeEditor.name, current, defsEditor);
                      const existingValue = current[dataKey];

                      let nextValue: unknown = rawValue;
                      if (typeof existingValue === 'number') {
                        const parsed = parseFloat(rawValue);
                        nextValue = Number.isFinite(parsed) ? parsed : existingValue;
                      } else if (typeof existingValue === 'boolean') {
                        if (rawValue === 'true') nextValue = true;
                        else if (rawValue === 'false') nextValue = false;
                      }

                      updateElement(
                        node.canvasElement.id,
                        { data: { ...current, [dataKey]: nextValue } } as Partial<CanvasElement>
                      );
                      setOpenAttributeEditor(null);
                      return;
                    }

                    if (defsEditor) {
                      const ctx = {
                        store: storeState,
                        node: nodeSnapshot,
                        attrName: openAttributeEditor.name,
                        rawValue,
                      } as const;
                      let handled = false;
                      if (nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                        handled = defsEditor.updateChild(ctx);
                      }
                      if (!handled) {
                        handled = defsEditor.update(ctx);
                      }
                      if (handled) {
                        setOpenAttributeEditor(null);
                        return;
                      }
                    }
                  }}
                >
                  Update
                </PanelStyledButton>
                {openAttributeEditor && (
                  <PanelStyledButton
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => {
                      const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore & {
                        updateElement?: CanvasStore['updateElement'];
                      };

                      if (node.canvasElement && storeState.updateElement) {
                        const current = node.canvasElement.data as Record<string, unknown>;
                        const dataKey = mapAttributeNameToDataKey(openAttributeEditor.name, current, defsEditor);
                        const next = { ...current };
                        delete next[dataKey];
                        storeState.updateElement(
                          node.canvasElement.id,
                          { data: next } as Partial<CanvasElement>
                        );
                        setOpenAttributeEditor(null);
                        return;
                      }

                      if (defsEditor) {
                        const ctx = {
                          store: storeState,
                          node: nodeSnapshot,
                          attrName: openAttributeEditor.name,
                        } as const;
                        let handled = false;
                        if (nodeSnapshot.childIndex !== undefined && defsEditor.removeAttribute) {
                          handled = defsEditor.removeAttribute(ctx);
                        }
                        if (!handled && nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                          handled = defsEditor.updateChild({ ...ctx, rawValue: '' });
                        }
                        if (!handled && defsEditor.removeAttribute) {
                          handled = defsEditor.removeAttribute(ctx);
                        }
                        if (!handled) {
                          handled = defsEditor.update({ ...ctx, rawValue: '' });
                        }
                        if (handled) {
                          setOpenAttributeEditor(null);
                        }
                      }
                    }}
                  >
                    Remove
                  </PanelStyledButton>
                )}
              </VStack>
            )}

            {attributeExpandedKeys.has(node.key) && (
              <VStack spacing={0.5} align="stretch" pl={0} pr={1} pt={0.5} pb={1}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.300' }}>
                  Add attribute
                </Text>
                <HStack spacing={1} align="center">
                  <PanelTextInput
                    value={newAttribute.name}
                    placeholder="name"
                    onChange={(val) => setNewAttribute((prev) => ({ ...prev, name: val }))}
                    width="40%"
                  />
                  <PanelTextInput
                    value={newAttribute.value}
                    placeholder="value"
                    onChange={(val) => setNewAttribute((prev) => ({ ...prev, value: val }))}
                    width="60%"
                  />
                </HStack>
                <PanelStyledButton
                  size="xs"
                  onClick={() => {
                    const name = newAttribute.name.trim();
                    if (!name) return;
                    const value = newAttribute.value;
                    const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
                    if (node.canvasElement) {
                      const updateElement = storeState.updateElement;
                      if (!updateElement) return;
                      const current = node.canvasElement.data as Record<string, unknown>;
                      const dataKey = mapAttributeNameToDataKey(name, current, defsEditor);
                      updateElement(node.canvasElement.id, { data: { ...current, [dataKey]: value } } as Partial<CanvasElement>);
                      setNewAttribute({ name: '', value: '' });
                      return;
                    }

                    if (defsEditor) {
                      const ctx = { store: storeState, node: nodeSnapshot, attrName: name, rawValue: value } as const;
                      let handled = false;
                      if (nodeSnapshot.childIndex !== undefined && defsEditor.addAttribute) {
                        handled = defsEditor.addAttribute(ctx);
                      }
                      if (!handled && nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                        handled = defsEditor.updateChild(ctx);
                      }
                      if (!handled && defsEditor.addAttribute) {
                        handled = defsEditor.addAttribute(ctx);
                      }
                      if (!handled) {
                        handled = defsEditor.update(ctx);
                      }
                      if (handled) {
                        setNewAttribute({ name: '', value: '' });
                      }
                    }
                  }}
                >
                  Add
                </PanelStyledButton>
              </VStack>
            )}



            {matchingContributions.length > 0 && (
              <VStack spacing={2} align="stretch" pt={1}>
                {matchingContributions.map(renderContribution)}
              </VStack>
            )}
            </VStack>
          );
        })()}
      </VStack>

      {isExpanded && node.children.length > 0 && (
        <VStack spacing={ROW_SPACING} align="stretch" px={0}>
          {node.children.map((child) => (
            <SvgNodeRow
              key={child.key}
              node={child}
              expandedKeys={expandedKeys}
              onToggle={onToggle}
              detailExpandedKeys={detailExpandedKeys}
              onToggleDetails={onToggleDetails}
              attributeExpandedKeys={attributeExpandedKeys}
              onToggleAttributes={onToggleAttributes}
              contributions={contributions}
              elements={elements}
              elementMap={elementMap}
              storeApi={storeApi}
              hiddenElementIds={hiddenElementIds}
              lockedElementIds={lockedElementIds}
              highlightedIds={highlightedIds}
              defsEditors={defsEditors}
              animationTargets={animationTargets}
              referencedDefs={referencedDefs}
              isVirtualShiftActive={isVirtualShiftActive}
              selectedIds={selectedIds}
              setHoveredStructureElementId={setHoveredStructureElementId}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export const SvgStructurePanel: React.FC<PanelComponentProps> = ({ panelKey }) => {
  const elements = useFrozenElementsDuringDrag();
  const elementMap = useMemo(() => buildElementMap(elements), [elements]);
  const animations = useCanvasStore(
    useShallow((state) => (state as CanvasStore & AnimationPluginSlice).animations ?? [])
  );

  const enabledPlugins = useEnabledPlugins();
  const enabledPluginsSet = useMemo(() => new Set(enabledPlugins), [enabledPlugins]);
  const contributions = useMemo(
    () =>
      pluginManager
        .getSvgStructureContributions()
        .filter((entry) => enabledPluginsSet.has(entry.pluginId)),
    [enabledPluginsSet]
  );

  const defsEditors = useMemo<RegisteredSvgDefsEditor[]>(
    () =>
      pluginManager
        .getSvgDefsEditors()
        .filter((entry) => enabledPluginsSet.has(entry.pluginId)),
    [enabledPluginsSet]
  );

  const defsRevision = useFrozenCanvasStoreValueDuringDrag(
    useCallback(
      (state) => defsEditors.map((entry) => entry.editor.revisionSelector?.(state as CanvasStore) ?? null),
      [defsEditors]
    ),
    shallow
  );

  const animationTargetKeys = useCanvasStore(
    useShallow((state) => {
      const animations = (state as CanvasStore & AnimationPluginSlice).animations ?? [];
      const targetKeys = new Set<AnimationTargetKey>();

      animations.forEach((anim) => {
        if (anim.gradientTargetId) {
          if (anim.stopIndex === undefined) {
            targetKeys.add(`def:gradient:${anim.gradientTargetId}`);
          } else {
            targetKeys.add(`child:stop:${anim.gradientTargetId}:${anim.stopIndex}`);
          }
        }
        if (anim.patternTargetId) {
          if (anim.patternChildIndex === undefined) {
            targetKeys.add(`def:pattern:${anim.patternTargetId}`);
          } else {
            targetKeys.add(`child:pattern:${anim.patternTargetId}:${anim.patternChildIndex}`);
          }
        }
        if (anim.markerTargetId) {
          if (anim.markerChildIndex === undefined) {
            targetKeys.add(`def:marker:${anim.markerTargetId}`);
          } else {
            targetKeys.add(`child:marker:${anim.markerTargetId}:${anim.markerChildIndex}`);
          }
        }
        if (anim.clipPathTargetId) {
          if (anim.clipPathChildIndex === undefined) {
            targetKeys.add(`def:clippath:${anim.clipPathTargetId}`);
          } else {
            targetKeys.add(`child:clippath:${anim.clipPathTargetId}:${anim.clipPathChildIndex}`);
          }
        }
        if (anim.maskTargetId) {
          if (anim.maskChildIndex === undefined) {
            targetKeys.add(`def:mask:${anim.maskTargetId}`);
          } else {
            targetKeys.add(`child:mask:${anim.maskTargetId}:${anim.maskChildIndex}`);
          }
        }
        if (anim.filterTargetId) {
          if (anim.filterPrimitiveIndex === undefined) {
            targetKeys.add(`def:filter:${anim.filterTargetId}`);
          } else {
            targetKeys.add(`child:filter:${anim.filterTargetId}:${anim.filterPrimitiveIndex}`);
          }
        }
        if (anim.symbolTargetId) {
          if (anim.symbolChildIndex === undefined) {
            targetKeys.add(`def:symbol:${anim.symbolTargetId}`);
          } else {
            targetKeys.add(`child:symbol:${anim.symbolTargetId}:${anim.symbolChildIndex}`);
          }
        }
      });

      return Array.from(targetKeys).sort();
    })
  );
  const animationTargets = useMemo(() => new Set<AnimationTargetKey>(animationTargetKeys), [animationTargetKeys]);

  const referencedDefs = useMemo(() => {
    const used = new Set<string>();
    const contributions = defsContributionRegistry.getContributions();
    contributions.forEach((c) => {
      const ids = c.collectUsedIds ? c.collectUsedIds(elements ?? []) : new Set<string>();
      ids.forEach((id) => used.add(id));
    });
    return used;
  }, [elements]);

  const [tree, setTree] = useState<SvgTreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['svg']));
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<Set<string>>(new Set());
  const [attributeExpandedKeys, setAttributeExpandedKeys] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Set<string>>(new Set());
  const storedEnabledTags = useCanvasStore((state) => (state as CanvasStore & UiSlice).svgStructureEnabledTags);
  const storedShowWithAnimationOnly = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).svgStructureShowWithAnimationOnly
  );
  const setStoredEnabledTags = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).setSvgStructureEnabledTags
  );
  const setStoredShowWithAnimationOnly = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).setSvgStructureShowWithAnimationOnly
  );
  const [enabledTags, setEnabledTags] = useState<Set<string>>(
    () => new Set(storedEnabledTags ?? [])
  );
  const [showWithAnimationOnly, setShowWithAnimationOnly] = useState(storedShowWithAnimationOnly ?? false);
  const hiddenElementIds = useCanvasStore((state) => state.hiddenElementIds ?? []);
  const lockedElementIds = useCanvasStore((state) => state.lockedElementIds ?? []);
  const hiddenElementIdSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const lockedElementIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);
  const selectedIds = useCanvasStore((state) => state.selectedIds ?? []);
  const isVirtualShiftActive = useCanvasStore((state) => state.isVirtualShiftActive ?? false);
  const setHoveredStructureElementId = useCanvasStore((state) => (state as unknown as SvgStructureSlice).setHoveredStructureElementId);
  const { openPanelKey } = useSidebarPanelState();
  const isPanelVisible = panelKey ? (openPanelKey === panelKey || openPanelKey === null) : false;

  const [rememberedNodeKey, setRememberedNodeKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(LAST_OPEN_NODE_KEY);
    } catch {
      return null;
    }
  });
  const lastDetailKeyRef = useRef<string | null>(rememberedNodeKey);
  const nodeListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    lastDetailKeyRef.current = rememberedNodeKey;
  }, [rememberedNodeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (rememberedNodeKey) {
        localStorage.setItem(LAST_OPEN_NODE_KEY, rememberedNodeKey);
      } else {
        localStorage.removeItem(LAST_OPEN_NODE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [rememberedNodeKey]);

  useEffect(() => {
    if (!isPanelVisible || !rememberedNodeKey || !tree) return;
    setExpandedKeys((prevExpanded) => {
      const next = new Set(prevExpanded);
      const parts = rememberedNodeKey.split('.');
      let prefix = '';
      parts.forEach((part, index) => {
        prefix = index === 0 ? part : `${prefix}.${part}`;
        next.add(prefix);
      });
      return next;
    });
    setDetailExpandedKeys((prev) => {
      if (prev.size === 1 && prev.has(rememberedNodeKey)) return prev;
      return new Set([rememberedNodeKey]);
    });
  }, [isPanelVisible, rememberedNodeKey, tree]);

  const storeApi = useMemo(() => ({
    getState: canvasStoreApi.getState,
    setState: canvasStoreApi.setState,
    subscribe: canvasStoreApi.subscribe,
  }), []);

  const collectDescendants = useCallback((id: string, acc: Set<string>) => {
    const el = elementMap.get(id);
    if (!el || el.type !== 'group') return;
    const childIds = (el.data as { childIds?: string[] }).childIds ?? [];
    childIds.forEach((childId) => {
      if (acc.has(childId)) return;
      acc.add(childId);
      collectDescendants(childId, acc);
    });
  }, [elementMap]);

  const highlightedIds = useMemo(() => {
    const acc = new Set<string>();
    selectedIds.forEach((id) => {
      acc.add(id);
      collectDescendants(id, acc);
    });
    return acc;
  }, [collectDescendants, selectedIds]);

  const { directAnimatedElementIds, indirectAnimatedElementIds } = useMemo(() => {
    const direct = new Set<string>();
    const indirect = new Set<string>();

    animations.forEach((anim) => {
      if (anim.targetElementId && elementMap.has(anim.targetElementId)) {
        direct.add(anim.targetElementId);
      }
    });

    elements.forEach((element) => {
      const referencedIds = getReferencedIds(element);
      if (referencedIds.length === 0) return;

      const referencedIdSet = new Set(referencedIds);

      for (const anim of animations) {
        if (anim.targetElementId === element.id) continue;

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

    return { directAnimatedElementIds: direct, indirectAnimatedElementIds: indirect };
  }, [animations, elementMap, elements]);

  const buildNode = useCallback(
    (
      el: Element,
      path: string,
      inDefs: boolean,
      parentId: string | null = null,
      childIndex?: number,
      numberPath: string | null = null
    ): SvgTreeNode | null => {
      const tagName = el.tagName.toLowerCase();
      if (SKIPPED_TAGS.has(tagName)) return null;
      if (isArtboardBackgroundRectNode(el, tagName)) return null;
      if (tagName !== 'svg' && availableTags.size > 0 && !enabledTags.has(tagName)) return null;
      const idAttribute = el.getAttribute('id');
      const dataElementId = el.getAttribute('data-element-id');
      const idType = idAttribute ? 'id' : dataElementId ? 'data' : null;
      // Resolve the canvas element early so we can use data.name as display label
      const canvasElement = dataElementId
        ? elementMap.get(dataElementId)
        : idAttribute
          ? elementMap.get(idAttribute)
          : undefined;
      const elementDataName = (canvasElement?.data as Record<string, unknown> | undefined)?.name as string | undefined;
      const displayId = elementDataName || formatDisplayId(idAttribute ?? dataElementId, idType, tagName);
      const attributes: SvgStructureAttributeSnapshot[] = Array.from(el.attributes)
        .filter((attr) => attr.name !== 'id' && !attr.name.startsWith('xmlns'))
        .map((attr) => ({
          name: attr.name,
          value: attr.value,
        }));
      const nextIsDefs = inDefs || tagName === 'defs';

      const childElements = Array.from(el.children);

      // When in defs, calculate adjusted child indices (excluding animation elements)
      let adjustedIdx = 0;
      let visibleChildIdx = 0;
      const children: SvgTreeNode[] = [];
      childElements.forEach((child, _domIdx) => {
        const childTagName = child.tagName.toLowerCase();
        const isAnimationElement = ANIMATION_TAGS.has(childTagName);

        // For defs, use adjusted index that excludes animation elements
        // For non-defs, use DOM index
        const effectiveChildIndex = nextIsDefs && !isAnimationElement ? adjustedIdx : _domIdx;

        // Only increment adjusted index for non-animation elements
        if (!isAnimationElement) {
          adjustedIdx++;
        }

        const nextVisibleNumber = String(visibleChildIdx + 1);
        const childNumberPath = numberPath ? `${numberPath}.${nextVisibleNumber}` : nextVisibleNumber;
        const childNode = buildNode(
          child,
          `${path}.${_domIdx}`,
          nextIsDefs,
          idAttribute ?? dataElementId ?? parentId,
          effectiveChildIndex,
          childNumberPath
        );
        if (!childNode) {
          return;
        }
        children.push(childNode);
        visibleChildIdx++;
      });
      return {
        key: path,
        numberPath,
        tagName,
        idAttribute,
        dataElementId,
        displayId,
        isDefs: nextIsDefs,
        // For defs children, keep the owner as the nearest defs ancestor (parentId) even if the child has its own id
        defsOwnerId: nextIsDefs ? (parentId ?? idAttribute ?? null) : undefined,
        childIndex,
        attributes,
        children,
        canvasElement,
      };
    },
    [availableTags, elementMap, enabledTags]
  );

  const rebuildTree = useCallback(() => {
    if (typeof DOMParser === 'undefined') return;

    const state = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
    const { content } = ExportManager.generateSvgContent(false, 0, state);

    if (!content) {
      setTree(null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    const svg = doc.querySelector('svg');

    if (parseError || !svg) {
      setTree(null);
      return;
    }

    const discoveredTags = new Set<string>();
    const collectTags = (el: Element) => {
      discoveredTags.add(el.tagName.toLowerCase());
      Array.from(el.children).forEach(collectTags);
    };
    collectTags(svg);
    const availableChanged =
      discoveredTags.size !== availableTags.size || Array.from(discoveredTags).some((tag) => !availableTags.has(tag));
    if (availableChanged) {
      setAvailableTags(discoveredTags);
    }
    setEnabledTags((prev) => {
      if (prev.size === 0) {
        const next = new Set(
          Array.from(discoveredTags).filter((tag) => tag !== 'svg' && !DEFAULT_HIDDEN_TAGS.has(tag))
        );
        setTimeout(() => setStoredEnabledTags(Array.from(next)), 0);
        return next;
      }
      const next = new Set<string>();
      const previousAvailable = availableTags;
      discoveredTags.forEach((tag) => {
        const isNewTag = !previousAvailable.has(tag);
        if (prev.has(tag) || (isNewTag && !DEFAULT_HIDDEN_TAGS.has(tag))) {
          next.add(tag);
        }
      });
      const isSame = next.size === prev.size && Array.from(next).every((tag) => prev.has(tag));
      if (!isSame) {
        setTimeout(() => setStoredEnabledTags(Array.from(next)), 0);
      }
      return isSame ? prev : next;
    });

    const nextTree = buildNode(svg, 'svg', false, svg.getAttribute('id'));
    if (!nextTree) {
      setTree(null);
      return;
    }
    setTree(nextTree);
    setExpandedKeys((prev) => {
      if (prev.size > 0) return prev;
      const initial = new Set<string>(['svg']);
      const defsChild = nextTree.children.find((child) => child.tagName === 'defs');
      if (defsChild) initial.add(defsChild.key);
      return initial;
    });
  }, [availableTags, buildNode, setStoredEnabledTags, storeApi]);

  useEffect(() => {
    rebuildTree();
  }, [elements, defsRevision, rebuildTree]);

  useEffect(() => {
    if (!isPanelVisible || !lastDetailKeyRef.current) return;
    const container = nodeListRef.current;
    const target = container?.querySelector(`[data-node-key="${lastDetailKeyRef.current}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center' });
    }
  }, [isPanelVisible, tree]);

  const handleToggle = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleAttributes = useCallback((key: string) => {
    setAttributeExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleDetails = useCallback((key: string) => {
    setDetailExpandedKeys((prev) => {
      if (prev.has(key)) {
        setRememberedNodeKey(null);
        return new Set();
      }
      setRememberedNodeKey(key);
      return new Set([key]);
    });
  }, []);

  const themeColors = useThemeColors();
  const menuListProps = {
    bg: themeColors.menu.bg,
    border: '1px solid',
    borderColor: themeColors.menu.borderColor,
    borderRadius: 'lg',
    boxShadow: 'lg',
    py: 1,
  };

  const menuItemProps = {
    color: themeColors.menu.iconColor,
    _hover: { bg: themeColors.menu.hoverBg },
    _focus: { outline: 'none', boxShadow: 'none', bg: 'transparent' },
    _active: { outline: 'none', bg: 'transparent' },
    fontSize: '14px',
    fontWeight: 'medium',
    px: 3,
    py: 2,
    gap: 2,
  };

  const availableTagList = useMemo(() => {
    const tags = Array.from(availableTags).filter((tag) => tag !== 'svg');
    tags.sort();
    return tags;
  }, [availableTags]);

  const rootsToRender = useMemo(() => {
    if (!tree) return [];
    if (!showWithAnimationOnly) return [tree];

    const nodeHasAnimationBadge = (node: SvgTreeNode): boolean => {
      const tag = node.tagName.toLowerCase();

      if (node.isDefs) {
        const ownerId = node.defsOwnerId ?? node.idAttribute ?? null;
        if (!ownerId) return false;

        if (DEF_CONTAINER_TAGS.has(tag) && node.idAttribute) {
          if (tag === 'lineargradient' || tag === 'radialgradient') {
            return animationTargets.has(`def:gradient:${ownerId}` as AnimationTargetKey);
          }
          if (tag === 'pattern') return animationTargets.has(`def:pattern:${ownerId}` as AnimationTargetKey);
          if (tag === 'marker') return animationTargets.has(`def:marker:${ownerId}` as AnimationTargetKey);
          if (tag === 'clippath') return animationTargets.has(`def:clippath:${ownerId}` as AnimationTargetKey);
          if (tag === 'mask') return animationTargets.has(`def:mask:${ownerId}` as AnimationTargetKey);
          if (tag === 'filter') return animationTargets.has(`def:filter:${ownerId}` as AnimationTargetKey);
          if (tag === 'symbol') return animationTargets.has(`def:symbol:${ownerId}` as AnimationTargetKey);
          return false;
        }

        const index = node.childIndex;
        if (index === undefined) return false;

        if (tag === 'stop') return animationTargets.has(`child:stop:${ownerId}:${index}` as AnimationTargetKey);
        return (
          animationTargets.has(`child:pattern:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:symbol:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:filter:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:marker:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:clippath:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:mask:${ownerId}:${index}` as AnimationTargetKey)
        );
      }

      const elementId = node.dataElementId ?? node.idAttribute ?? node.canvasElement?.id ?? null;
      if (!elementId) return false;

      return directAnimatedElementIds.has(elementId) || indirectAnimatedElementIds.has(elementId);
    };

    const filterNode = (node: SvgTreeNode): SvgTreeNode[] => {
      const filteredChildren = node.children.flatMap(filterNode);
      if (!nodeHasAnimationBadge(node)) {
        return filteredChildren;
      }
      return [{ ...node, children: filteredChildren }];
    };

    return filterNode(tree);
  }, [
    animationTargets,
    directAnimatedElementIds,
    indirectAnimatedElementIds,
    showWithAnimationOnly,
    tree,
  ]);

  const headerActions = (
    <Menu closeOnSelect={false} isLazy>
      <MenuButton
        as={IconButton}
        aria-label="Filter element types"
        icon={<MoreVertical size={14} />}
        size="xs"
        variant="ghost"
        borderRadius="full"
        minW="24px"
        h="24px"
        p={0}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <MenuList
        {...menuListProps}
        minW="180px"
        maxH="240px"
        overflowY="auto"
        px={0}
        py={1}
        sx={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '4px',
          },
        }}
      >
        <MenuItem
          {...menuItemProps}
          closeOnSelect={false}
          onClick={(e) => {
            e.stopPropagation();
            setShowWithAnimationOnly((prev) => {
              const next = !prev;
              setStoredShowWithAnimationOnly(next);
              return next;
            });
          }}
        >
          <Checkbox
            isChecked={showWithAnimationOnly}
            pointerEvents="none"
            size="sm"
          >
            only with animation
          </Checkbox>
        </MenuItem>
        <MenuDivider />
        {availableTagList.length === 0 && <MenuItem {...menuItemProps} isDisabled>No element types</MenuItem>}
        {availableTagList.map((tag) => (
          <MenuItem
            {...menuItemProps}
            key={tag}
            closeOnSelect={false}
            onClick={(e) => {
              e.stopPropagation();
              setEnabledTags((prev) => {
                const next = new Set(prev);
                if (next.has(tag)) {
                  next.delete(tag);
                } else {
                  next.add(tag);
                }
                setStoredEnabledTags(Array.from(next));
                return next;
              });
            }}
          >
            <Checkbox
              isChecked={enabledTags.has(tag)}
              pointerEvents="none"
              size="sm"
            >
              {tag}
            </Checkbox>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );

  return (
    <Panel
      title="Structure"
      panelKey={panelKey}
      isCollapsible={false}
      isMaximizable={false}
      defaultOpen={true}
      headerActions={headerActions}
    >
      <VStack spacing={0.5} align="stretch" px={0} py={0} ref={nodeListRef}>
        {!tree && (
          <Text {...textProps}>SVG root is not available yet.</Text>
        )}
        {tree && rootsToRender.map((root) => (
          <SvgNodeRow
            key={root.key}
            node={root}
            expandedKeys={expandedKeys}
            onToggle={handleToggle}
            detailExpandedKeys={detailExpandedKeys}
            onToggleDetails={handleToggleDetails}
            attributeExpandedKeys={attributeExpandedKeys}
            onToggleAttributes={handleToggleAttributes}
            contributions={contributions}
            elements={elements}
            elementMap={elementMap}
            storeApi={storeApi}
            hiddenElementIds={hiddenElementIdSet}
            lockedElementIds={lockedElementIdSet}
            highlightedIds={highlightedIds}
            defsEditors={defsEditors}
            animationTargets={animationTargets}
            referencedDefs={referencedDefs}
            isVirtualShiftActive={isVirtualShiftActive}
            selectedIds={selectedIds}
            setHoveredStructureElementId={setHoveredStructureElementId}
          />
        ))}
      </VStack>
    </Panel>
  );
};
