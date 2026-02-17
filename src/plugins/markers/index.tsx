import React from 'react';
import { Target } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createMarkersSlice, type MarkerDefinition, type MarkersSlice } from './slice';
import { MarkersPanel } from './MarkersPanel';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import type { SvgDefsEditor } from '../../types/plugins';
import type { CanvasElement } from '../../types';
import type { AnimationPluginSlice, SVGAnimation, AnimationState } from '../animationSystem/types';
import { serializeAnimation } from '../animationSystem';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import { normalizeMarkerId } from '../../utils/markerUtils';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { generateShortId } from '../../utils/idGenerator';
import './importContribution';

registerStateKeys('markers', ['markers'], 'persist');

const markersSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createMarkersSlice(set, get, api),
});

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Strip animation elements from a node's innerHTML.
 * Animations are imported separately by the animation system.
 */
const stripAnimationsFromContent = (node: Element): string => {
  const clone = node.cloneNode(true) as Element;
  const animationSelectors = 'animate, animateTransform, animateMotion, animateColor, set';
  clone.querySelectorAll(animationSelectors).forEach((el) => el.remove());
  return clone.innerHTML;
};

const stripAnimateForAttributes = (content: string, attributes: Set<string>): string => {
  if (!content || attributes.size === 0) return content;
  let cleaned = content;
  attributes.forEach((attr) => {
    const re = new RegExp(
      `<animate[^>]*\\sattributeName="${attr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"[^>]*>([\\s\\S]*?<\\/animate>)?|<animate[^>]*\\sattributeName="${attr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"[^>]*/>`,
      'g'
    );
    cleaned = cleaned.replace(re, '');
  });
  return cleaned;
};

const injectAnimationsIntoFirstShape = (content: string, animationsBlock: string): string => {
  if (!animationsBlock.trim()) return content;
  // Try to inject into the first basic shape so attributeName (e.g., r) targets the intended node
  const shapes = ['circle', 'path', 'rect', 'ellipse', 'polygon', 'polyline'];
  for (const tag of shapes) {
    const closingTag = new RegExp(`</${tag}>`, 'i');
    const selfClosing = new RegExp(`<${tag}([^>]*)/>`, 'i');
    if (closingTag.test(content)) {
      return content.replace(closingTag, `${animationsBlock}</${tag}>`);
    }
    const selfMatch = content.match(selfClosing);
    if (selfMatch) {
      const replacement = `<${tag}${selfMatch[1]}>${animationsBlock}</${tag}>`;
      return content.replace(selfClosing, replacement);
    }
  }
  return content + animationsBlock;
};

const collectMarkerUsage = (elements: CanvasElement[]): Set<string> => {
  const usage = new Set<string>();
  const add = (raw?: string) => {
    const normalized = normalizeMarkerId(raw);
    if (normalized) {
      usage.add(normalized);
      return;
    }
    if (raw) {
      // Fallback: strip wrappers like url(#...) or leading #
      const cleaned = raw.replace(/^url\(\s*#?/, '').replace(/\)\s*$/, '').replace(/^#/, '');
      if (cleaned) usage.add(cleaned);
    }
  };
  elements.forEach((element) => {
    const data = element.data as Record<string, unknown> | undefined;
    if (!data) return;
    add((data as { markerStart?: string }).markerStart);
    add((data as { markerMid?: string }).markerMid);
    add((data as { markerEnd?: string }).markerEnd);
  });
  return usage;
};

const parseMarkerAttr = (value: string | null): string | undefined => {
  return normalizeMarkerId(value);
};

const renderMarkerNode = (marker: MarkerDefinition, animationNodes: React.ReactNode[] = []) => {
  const hasContent = Boolean(marker.content);
  return (
    <marker
      key={marker.id}
      id={marker.id}
      markerUnits={marker.markerUnits ?? 'strokeWidth'}
      markerWidth={marker.markerWidth}
      markerHeight={marker.markerHeight}
      refX={marker.refX}
      refY={marker.refY}
      orient={marker.orient}
      viewBox={marker.viewBox ?? `0 0 ${marker.markerWidth} ${marker.markerHeight}`}
    >
      {hasContent ? <g dangerouslySetInnerHTML={{ __html: marker.content ?? '' }} /> : <path d={marker.path} fill="context-stroke" />}
      {animationNodes}
    </marker>
  );
};

const markerDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'markers-editor',
  appliesTo: (node) => {
    if (!node.isDefs) return false;
    if (node.tagName === 'marker') return true;
    return Boolean(node.defsOwnerId);
  },
  mapAttributeNameToDataKey: (name, current) => {
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      'markerunits': 'markerUnits',
      'marker-units': 'markerUnits',
      'markerwidth': 'markerWidth',
      'marker-width': 'markerWidth',
      'markerheight': 'markerHeight',
      'marker-height': 'markerHeight',
      'refx': 'refX',
      'ref-x': 'refX',
      'refy': 'refY',
      'ref-y': 'refY',
      orient: 'orient',
      viewbox: 'viewBox',
    };
    const mapped = map[normalized];
    if (mapped) return mapped;
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    if (camel in current) return camel;
    return normalized;
  },
  update: ({ store, node, attrName, rawValue }) => {
    const markerState = store as unknown as MarkersSlice;
    const marker = (markerState.markers ?? []).find((m) => m.id === (node.defsOwnerId ?? node.idAttribute));
    const updateMarker = markerState.updateMarker;
    if (!marker || !updateMarker) return false;
    const current = marker as unknown as Record<string, unknown>;
    const dataKey = markerDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;
    const existing = current[dataKey];
    let nextValue: unknown = rawValue;
    if (typeof existing === 'number') {
      const parsed = parseFloat(rawValue);
      nextValue = Number.isFinite(parsed) ? parsed : existing;
    } else if (typeof existing === 'boolean') {
      if (rawValue === 'true') nextValue = true;
      else if (rawValue === 'false') nextValue = false;
    }
    updateMarker(marker.id, { [dataKey]: nextValue });
    return true;
  },
  addAttribute: ({ store, node, attrName, rawValue }) => markerDefsEditor.update({ store, node, attrName, rawValue }),
  removeAttribute: ({ store, node, attrName }) => {
    const markerState = store as unknown as MarkersSlice;
    const marker = (markerState.markers ?? []).find((m) => m.id === (node.defsOwnerId ?? node.idAttribute));
    const updateMarker = markerState.updateMarker;
    if (!marker || !updateMarker) return false;
    const current = marker as unknown as Record<string, unknown>;
    const dataKey = markerDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;
    const next = { ...marker } as Record<string, unknown>;
    delete next[dataKey];
    updateMarker(marker.id, next as Partial<MarkerDefinition>);
    return true;
  },
  removeChild: ({ store, node }) => {
    const markerState = store as unknown as MarkersSlice;
    const marker = (markerState.markers ?? []).find((m) => m.id === (node.defsOwnerId ?? node.idAttribute));
    const updateMarker = markerState.updateMarker;
    const removeMarker = markerState.removeMarker;
    if (!marker) return false;

    // Delete the marker definition itself
    if (node.tagName === 'marker') {
      removeMarker?.(marker.id);
      return true;
    }

    // If we don't have a concrete child index (likely an animation node), remove the whole marker
    if (node.childIndex === undefined) {
      removeMarker?.(marker.id);
      return true;
    }

    // Delete a child inside marker content
    if (typeof DOMParser === 'undefined') return false;
    const content = marker.content ?? '';
    if (!content) {
      // No rich content; remove whole marker as fallback
      removeMarker?.(marker.id);
      return true;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<marker>${content}</marker>`, 'image/svg+xml');
    const markerEl = doc.querySelector('marker');
    if (!markerEl) return false;

    const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
    const children = Array.from(markerEl.children).filter((el) => !ANIMATION_TAGS.has(el.tagName.toLowerCase()));
    if (node.childIndex === undefined || node.childIndex < 0 || node.childIndex >= children.length) return false;
    const target = children[node.childIndex];
    target.parentElement?.removeChild(target);
    const nextContent = markerEl.innerHTML;
    updateMarker?.(marker.id, { content: nextContent });
    return true;
  },
  revisionSelector: (state) => (state as unknown as MarkersSlice).markers,
};

defsContributionRegistry.register({
  id: 'markers',
  collectUsedIds: collectMarkerUsage,
  renderDefs: (state, usedIds) => {
    const markerState = state as CanvasStore & MarkersSlice;
    const animState = state as CanvasStore & AnimationPluginSlice;
    const markers = markerState.markers ?? [];
    const usedMarkers = markers.filter((marker) => usedIds.has(marker.id));
    if (!usedMarkers.length) return null;
    const animations = animState.animations ?? [];
    const animationState = animState.animationState;
    // Allow render when playing, has played, or workspace is open (consistent with renderAnimationsForElement)
    const allowRender = animationState?.isPlaying || animationState?.hasPlayed || animationState?.isWorkspaceOpen;
    return (
      <>
        {usedMarkers.map((marker) => {
          const markerAnimations = allowRender
            ? renderAnimationsForElement(
              marker.id,
              animations as SVGAnimation[],
              animationState as AnimationState
            )
            : null;
          return renderMarkerNode(marker, markerAnimations ?? []);
        })}
      </>
    );
  },
  serializeDefs: (state, usedIds) => {
    const markerState = state as CanvasStore & MarkersSlice;
    const animState = state as CanvasStore & AnimationPluginSlice;
    const chainDelays = animState.calculateChainDelays ? animState.calculateChainDelays() : new Map<string, number>();
    const markers = markerState.markers ?? [];
    const filtered = markers.filter((marker) => usedIds.has(marker.id));
    if (!filtered.length) return [];
    return filtered
      .map((marker) => {
        const attrs = [
          `id="${marker.id}"`,
          `markerUnits="${escapeAttr(marker.markerUnits ?? 'strokeWidth')}"`,
          `markerWidth="${marker.markerWidth}"`,
          `markerHeight="${marker.markerHeight}"`,
          `refX="${marker.refX}"`,
          `refY="${marker.refY}"`,
          `orient="${escapeAttr(marker.orient)}"`,
          `viewBox="${escapeAttr(marker.viewBox ?? `0 0 ${marker.markerWidth} ${marker.markerHeight}`)}"`,
        ];
        const markerAnimations = (animState.animations ?? [])
          .filter((a) => a.markerTargetId === marker.id)
          .map((a) => serializeAnimation(a, chainDelays));
        const animAttributeNames = new Set(
          (animState.animations ?? [])
            .filter((a) => a.markerTargetId === marker.id && a.attributeName)
            .map((a) => a.attributeName as string)
        );
        const cleanedContent = marker.content
          ? stripAnimateForAttributes(marker.content, animAttributeNames)
          : undefined;
        const animationsBlock = markerAnimations.length
          ? `\n${markerAnimations.map((line) => `  ${line}`).join('\n')}\n`
          : '';
        const baseBody = cleanedContent ?? `<path d="${escapeAttr(marker.path)}" fill="context-stroke" />`;
        const bodyWithAnimations = animationsBlock ? injectAnimationsIntoFirstShape(baseBody, animationsBlock) : baseBody;
        return `<marker ${attrs.join(' ')}>${bodyWithAnimations}</marker>`;
      });
  },
});

const importMarkerDefs = (doc: Document): Record<string, MarkerDefinition[]> | null => {
  const nodes = Array.from(doc.querySelectorAll('marker'));
  if (!nodes.length) return null;

  const markers: MarkerDefinition[] = nodes.map((node) => {
    const id = node.getAttribute('id') ?? generateShortId('mrk');
    const markerWidth = parseFloat(node.getAttribute('markerWidth') ?? '6');
    const markerHeight = parseFloat(node.getAttribute('markerHeight') ?? '6');
    const refX = parseFloat(node.getAttribute('refX') ?? '3');
    const refY = parseFloat(node.getAttribute('refY') ?? '3');
    const orient = node.getAttribute('orient') ?? 'auto';
    const markerUnits = node.getAttribute('markerUnits') ?? undefined;
    const viewBox = node.getAttribute('viewBox') ?? undefined;

    // Preserve ALL content - animations, multiple elements, colors, etc.
    // Strip animations only since they are imported separately by the animation system
    const content = stripAnimationsFromContent(node);
    
    // Extract path ONLY as fallback for basic rendering when content is not supported
    // The content field is the primary source for rendering
    const pathNode = node.querySelector('path');
    const path = pathNode?.getAttribute('d') ?? 'M0 0';

    return {
      id,
      name: id.replace(/^marker-/, '').replace(/-/g, ' '),
      path,
      markerWidth,
      markerHeight,
      refX,
      refY,
      orient,
      markerUnits,
      viewBox,
      content,
    };
  });

  return { marker: markers };
};

export const markersPlugin: PluginDefinition<CanvasStore> = {
  id: 'markers',
  metadata: {
    label: 'Markers',
    icon: Target,
    cursor: 'default',
  },
  slices: [markersSliceFactory],
  importDefs: importMarkerDefs,
  styleAttributeExtractor: (element) => {
    const style: Record<string, unknown> = {};
    const markerStart = parseMarkerAttr(element.getAttribute('marker-start'));
    const markerMid = parseMarkerAttr(element.getAttribute('marker-mid'));
    const markerEnd = parseMarkerAttr(element.getAttribute('marker-end'));
    if (markerStart) style.markerStart = markerStart;
    if (markerMid) style.markerMid = markerMid;
    if (markerEnd) style.markerEnd = markerEnd;
    return style;
  },
  relatedPluginPanels: [
    {
      id: 'markers-panel',
      targetPlugin: 'library',
      component: MarkersPanel,
      order: 2,
    },
  ],
  svgDefsEditors: [markerDefsEditor],
};
