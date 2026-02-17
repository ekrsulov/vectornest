/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createGradientsSlice, type GradientsSlice, type GradientDef, type GradientStop } from './slice';
import { paintContributionRegistry } from '../../utils/paintContributionRegistry';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import type { SvgDefsEditor } from '../../types/plugins';
import { paintTypeRegistry, type CustomPaint } from '../../utils/paintTypeRegistry';
import { stylePresetRegistry, type Preset } from '../../utils/stylePresetRegistry';
import { adjustStrokeForDarkMode } from '../../utils/fillAndStrokePresets';
import { GradientPicker } from './GradientPicker';
import { GradientsPanel } from './GradientsPanel';
import React, { useLayoutEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { collectUsedPaintIds } from '../../utils/paintUsageUtils';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import type { MasksSlice } from '../masks/types';
import { generateShortId } from '../../utils/idGenerator';
import { resolveLinearGradientCoordinates } from './linearGradientUtils';
import './persistence';
import './importContribution';

/**
 * Component that properly inserts SVG gradient content using the SVG parser.
 * Gradients must be direct children of <defs>, so we use a ref-based approach
 * that inserts the gradient element next to a hidden placeholder.
 */
const GradientSvgContent: React.FC<{ content: string; gradientKey?: string }> = ({ content, gradientKey }) => {
  const gRef = useRef<SVGGElement>(null);
  const insertedRef = useRef<Element | null>(null);

  useLayoutEffect(() => {
    if (!gRef.current) return;

    // Clean up any previously inserted element
    if (insertedRef.current && insertedRef.current.parentElement) {
      insertedRef.current.parentElement.removeChild(insertedRef.current);
      insertedRef.current = null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`,
      'image/svg+xml'
    );

    // Find the gradient element (linearGradient or radialGradient)
    const gradient = doc.querySelector('linearGradient, radialGradient');
    if (!gradient) return;

    const parent = gRef.current.parentElement;
    if (!parent) return;

    // Import the gradient node and insert it before our placeholder
    const imported = document.importNode(gradient, true);
    parent.insertBefore(imported, gRef.current);
    insertedRef.current = imported;

    // Cleanup on unmount or when content changes
    return () => {
      if (insertedRef.current && insertedRef.current.parentElement) {
        insertedRef.current.parentElement.removeChild(insertedRef.current);
        insertedRef.current = null;
      }
    };
  }, [content, gradientKey]);

  // Return a hidden placeholder <g> element that marks the insertion point
  return <g ref={gRef} style={{ display: 'none' }} />;
};

const gradientsSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGradientsSlice(set as any, get as any, api as any);
  return { state: slice };
};

const gradientDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'gradients-editor',
  appliesTo: (node) => {
    if (!node.isDefs || !node.defsOwnerId) return false;
    // Match gradient elements directly or child elements like 'stop'
    if (node.tagName.includes('gradient')) return true;
    if (node.tagName === 'stop') return true;
    return false;
  },
  mapAttributeNameToDataKey: (name, current) => {
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      href: 'href',
      'xlink:href': 'href',
      'gradientunits': 'gradientUnits',
      'gradient-units': 'gradientUnits',
      'gradienttransform': 'gradientTransform',
      'gradient-transform': 'gradientTransform',
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
    };
    const mapped = map[normalized];
    if (mapped) return mapped;
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    if (camel in current) return camel;
    return normalized;
  },
  update: ({ store, node, attrName, rawValue }) => {
    const gradientState = store as unknown as GradientsSlice;
    const gradient = (gradientState.gradients ?? []).find((g) => g.id === (node.defsOwnerId ?? node.idAttribute));
    const updateGradient = gradientState.updateGradient;
    if (!gradient || !updateGradient) return false;

    const current = gradient as unknown as Record<string, unknown>;
    const dataKey = gradientDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;

    // Known gradient props map directly; unknown attributes go into extraAttributes
    const knownKeys = new Set([
      'id',
      'name',
      'type',
      'angle',
      'x1',
      'y1',
      'x2',
      'y2',
      'cx',
      'cy',
      'r',
      'fx',
      'fy',
      'href',
      'gradientUnits',
      'stops',
      'rawContent',
      'preset',
      'extraAttributes',
    ]);

    if (knownKeys.has(dataKey)) {
      const existing = current[dataKey];
      let nextValue: unknown = rawValue;
      if (typeof existing === 'number') {
        const parsed = parseFloat(rawValue);
        nextValue = Number.isFinite(parsed) ? parsed : existing;
      } else if (typeof existing === 'boolean') {
        if (rawValue === 'true') nextValue = true;
        else if (rawValue === 'false') nextValue = false;
      }
      if (dataKey === 'stops') return false;
      updateGradient(gradient.id, { [dataKey]: nextValue });
      return true;
    }

    // Store unrecognized attributes under extraAttributes so they round-trip
    const next = { ...gradient } as GradientDef & { extraAttributes?: Record<string, unknown> };
    const extra = { ...(gradient.extraAttributes ?? {}) } as Record<string, unknown>;
    extra[attrName] = rawValue;
    next.extraAttributes = extra;
    updateGradient(gradient.id, next);
    return true;
  },
  updateChild: ({ store, node, attrName, rawValue }) => {
    if (node.childIndex === undefined) return false;
    const gradientState = store as unknown as GradientsSlice;
    const gradient = (gradientState.gradients ?? []).find((g) => g.id === (node.defsOwnerId ?? node.idAttribute));
    const updateGradient = gradientState.updateGradient;
    if (!gradient || !updateGradient) return false;
    const stops = [...(gradient.stops ?? [])];
    const stop = stops[node.childIndex];
    if (!stop) return false;
      const name = attrName.toLowerCase();
      const nextStop = { ...stop } as Record<string, unknown>;
      const nextExtra = { ...(stop.extraAttributes ?? {}) } as Record<string, unknown>;
      if (name === 'offset') {
        const parsed = parseFloat(rawValue);
        if (Number.isFinite(parsed)) nextStop.offset = parsed;
      } else if (name === 'stop-color' || name === 'stopcolor') {
        nextStop.color = rawValue;
      } else if (name === 'stop-opacity' || name === 'stopopacity') {
        const parsed = parseFloat(rawValue);
        if (Number.isFinite(parsed)) nextStop.opacity = parsed;
        else nextStop.opacity = undefined;
      } else {
        nextExtra[attrName] = rawValue;
      }
      if (Object.keys(nextExtra).length > 0) {
        nextStop.extraAttributes = nextExtra;
      } else {
        delete nextStop.extraAttributes;
      }
      stops[node.childIndex] = nextStop as GradientStop;
    updateGradient(gradient.id, { stops });
    return true;
  },
  addChild: ({ store, node, position }) => {
    const gradientState = store as unknown as GradientsSlice;
    const gradient = (gradientState.gradients ?? []).find((g) => g.id === (node.defsOwnerId ?? node.idAttribute));
    const updateGradient = gradientState.updateGradient;
    if (!gradient || !updateGradient) return false;
    const stops = [...(gradient.stops ?? [])];
    const insertAt = position ?? stops.length;
    const reference = stops[Math.max(0, Math.min(stops.length - 1, insertAt - 1))];
    const nextStop: GradientStop = {
      offset: reference?.offset ?? 50,
      color: reference?.color ?? '#000000',
      opacity: reference?.opacity,
    };
    stops.splice(insertAt, 0, nextStop);
    updateGradient(gradient.id, { stops });
    return true;
  },
  removeChild: ({ store, node }) => {
    const gradientState = store as unknown as GradientsSlice;
    const gradient = (gradientState.gradients ?? []).find((g) => g.id === (node.defsOwnerId ?? node.idAttribute));
    const updateGradient = gradientState.updateGradient;
    const removeGradient = gradientState.removeGradient;
    if (!gradient) return false;

    // Delete entire gradient definition
    const tag = node.tagName.toLowerCase();
    if (tag === 'lineargradient' || tag === 'radialgradient') {
      removeGradient?.(gradient.id);
      return true;
    }

    if (node.childIndex === undefined) return false;
    if (!updateGradient) return false;
    const stops = [...(gradient.stops ?? [])];
    if (node.childIndex < 0 || node.childIndex >= stops.length) return false;
    stops.splice(node.childIndex, 1);
    updateGradient(gradient.id, { stops });
    return true;
  },
  addAttribute: ({ store, node, attrName, rawValue }) => {
    if (node.childIndex !== undefined) {
      return gradientDefsEditor.updateChild?.({ store, node, attrName, rawValue }) ?? false;
    }
    return gradientDefsEditor.update({ store, node, attrName, rawValue });
  },
  removeAttribute: ({ store, node, attrName }) => {
    const gradientState = store as unknown as GradientsSlice;
    const gradient = (gradientState.gradients ?? []).find((g) => g.id === (node.defsOwnerId ?? node.idAttribute));
    const updateGradient = gradientState.updateGradient;
    if (!gradient || !updateGradient) return false;
    if (node.childIndex !== undefined) {
      const stops = [...(gradient.stops ?? [])];
      const stop = stops[node.childIndex];
      if (!stop) return false;
      const nextStop = { ...stop } as Record<string, unknown> & { extraAttributes?: Record<string, unknown> };
      const nextExtra = { ...(stop.extraAttributes ?? {}) } as Record<string, unknown>;
      delete nextStop[attrName];
      delete nextExtra[attrName];
      if (Object.keys(nextExtra).length > 0) {
        nextStop.extraAttributes = nextExtra;
      } else {
        delete nextStop.extraAttributes;
      }
      stops[node.childIndex] = nextStop as GradientStop;
      updateGradient(gradient.id, { stops });
      return true;
    }
    const current = gradient as unknown as Record<string, unknown>;
    const dataKey = gradientDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;
    const next = { ...gradient } as Record<string, unknown> & { extraAttributes?: Record<string, unknown> };
    delete next[dataKey];
    const extra = { ...(gradient.extraAttributes ?? {}) } as Record<string, unknown>;
    delete extra[attrName];
    if (Object.keys(extra).length > 0) {
      next.extraAttributes = extra;
    } else {
      delete next.extraAttributes;
    }
    if (dataKey === 'stops') return false;
    updateGradient(gradient.id, next as Partial<GradientDef>);
    return true;
  },
  revisionSelector: (state) => (state as unknown as GradientsSlice).gradients,
};

const importGradientDefs = (doc: Document): Record<string, GradientDef[]> | null => {
  const gradientNodes = Array.from(doc.querySelectorAll('linearGradient, radialGradient'));

  if (!gradientNodes.length) return null;

  // Helper to parse value and remove % if present.
  // For objectBoundingBox (default), normalize fractions (0-1) to percentages (0-100)
  const parseValue = (
    value: string | null,
    defaultValue: number,
    gradientUnits: 'userSpaceOnUse' | 'objectBoundingBox'
  ): number => {
    if (!value) return defaultValue;
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      return parseFloat(trimmed.slice(0, -1));
    }
    const num = parseFloat(trimmed);
    if (!Number.isFinite(num)) return defaultValue;
    if (gradientUnits !== 'userSpaceOnUse' && num >= 0 && num <= 1) {
      return num * 100;
    }
    return num;
  };

  // Helper to convert RGB to hex
  const rgbToHex = (rgb: string): string => {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return rgb;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // Helper to parse color from stop element
  const parseStopColor = (stop: Element): string => {
    // Try stop-color attribute (SVG standard)
    let color = stop.getAttribute('stop-color');

    // Try stopColor (camelCase variant)
    if (!color) {
      color = stop.getAttribute('stopColor');
    }

    // Try inline style
    if (!color) {
      const style = stop.getAttribute('style');
      if (style) {
        const match = style.match(/stop-color\s*:\s*([^;]+)/);
        if (match) color = match[1].trim();
      }
    }

    // Fallback: infer from animations on stop-color
    if (!color) {
      const anim = stop.querySelector('animate[attributeName="stop-color"]');
      const values = anim?.getAttribute('values');
      const from = anim?.getAttribute('from');
      const to = anim?.getAttribute('to');
      const token =
        values?.split(';')?.[0]?.trim() ||
        from?.split(';')?.[0]?.trim() ||
        to?.split(';')?.[0]?.trim();
      if (token && token.length > 0) {
        color = token;
      }
    }

    // Default to black if no color found
    if (!color) {
      color = '#000000';
    }

    // Convert rgb() to hex if needed
    if (color.startsWith('rgb')) {
      color = rgbToHex(color);
    }

    return color;
  };

  // Helper to parse stop-opacity from stop element
  const parseStopOpacity = (stop: Element): number | undefined => {
    // Try stop-opacity attribute (SVG standard)
    let opacityStr = stop.getAttribute('stop-opacity');

    // Try stopOpacity (camelCase variant)
    if (!opacityStr) {
      opacityStr = stop.getAttribute('stopOpacity');
    }

    // Try inline style
    if (!opacityStr) {
      const style = stop.getAttribute('style');
      if (style) {
        const match = style.match(/stop-opacity\s*:\s*([^;]+)/);
        if (match) opacityStr = match[1].trim();
      }
    }

    if (opacityStr) {
      const opacity = parseFloat(opacityStr);
      if (Number.isFinite(opacity)) {
        return opacity;
      }
    }

    return undefined;
  };

  const collectExtraAttributes = (node: Element, known: Set<string>): Record<string, string> => {
    const extra: Record<string, string> = {};
    Array.from(node.attributes).forEach((attr) => {
      const normalized = attr.name.toLowerCase();
      if (known.has(normalized)) return;
      extra[attr.name] = attr.value;
    });
    return extra;
  };

  const parseStops = (node: Element, gradientUnits: 'userSpaceOnUse' | 'objectBoundingBox'): GradientStop[] => {
    const stops: GradientStop[] = [];
    Array.from(node.querySelectorAll('stop')).forEach((stop) => {
      let offset = parseValue(stop.getAttribute('offset'), 0, gradientUnits);
      // Normalize offset to 0-100 range
      if (offset >= 0 && offset <= 1) {
        offset = offset * 100;
      }

      const color = parseStopColor(stop);
      const opacity = parseStopOpacity(stop);

      const knownStopAttrs = new Set([
        'offset',
        'stop-color',
        'stopcolor',
        'stop-opacity',
        'stopopacity',
        'style',
      ]);
      const extraAttributes = collectExtraAttributes(stop, knownStopAttrs);

      stops.push({
        offset,
        color,
        opacity,
        ...(Object.keys(extraAttributes).length ? { extraAttributes } : {}),
      });
    });
    return stops;
  };

  const cloneStops = (stops: GradientStop[] | undefined): GradientStop[] =>
    (stops ?? []).map((s) => ({ ...s, extraAttributes: s.extraAttributes ? { ...s.extraAttributes } : undefined }));

  const gradientNodesById = new Map<string, Element>();
  gradientNodes.forEach((node) => {
    const id = node.getAttribute('id');
    if (id) {
      gradientNodesById.set(id, node);
    }
  });

  const resolved = new Map<string, GradientDef>();
  const resolving = new Set<string>();

  const resolveGradient = (node: Element): GradientDef | null => {
    const tagName = node.tagName.toLowerCase();
    const type: GradientDef['type'] = tagName === 'radialgradient' ? 'radial' : 'linear';
    const nodeId = node.getAttribute('id') ?? generateShortId('grd');

    if (resolved.has(nodeId)) return resolved.get(nodeId) ?? null;
    if (resolving.has(nodeId)) return null;

    resolving.add(nodeId);

    const href = node.getAttribute('href') ?? node.getAttribute('xlink:href');
    const refId = href?.startsWith('#') ? href.slice(1) : undefined;
    const referencedNode = refId ? gradientNodesById.get(refId) : undefined;
    const inherited = referencedNode ? resolveGradient(referencedNode) : null;

    const gradientUnits = (node.getAttribute('gradientUnits') as 'userSpaceOnUse' | 'objectBoundingBox' | null) ?? inherited?.gradientUnits ?? 'objectBoundingBox';

    const stops = parseStops(node, gradientUnits);
    const effectiveStops = stops.length > 0 ? stops : cloneStops(inherited?.stops);
    if (!effectiveStops.length) {
      resolving.delete(nodeId);
      return null;
    }

    const baseDef: GradientDef = {
      id: nodeId,
      name: nodeId,
      type,
      gradientUnits,
      stops: effectiveStops,
    };

    if (refId) {
      baseDef.href = refId;
    }

    if (type === 'linear') {
      const x1 = parseValue(node.getAttribute('x1'), inherited?.x1 ?? 0, gradientUnits);
      const y1 = parseValue(node.getAttribute('y1'), inherited?.y1 ?? 0, gradientUnits);
      const x2 = parseValue(node.getAttribute('x2'), inherited?.x2 ?? 100, gradientUnits);
      const y2 = parseValue(node.getAttribute('y2'), inherited?.y2 ?? 0, gradientUnits);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle =
        dx === 0 && dy === 0
          ? inherited?.angle ?? 90
          : ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
      Object.assign(baseDef, { x1, y1, x2, y2, angle });
    } else {
      const cx = parseValue(node.getAttribute('cx'), inherited?.cx ?? 50, gradientUnits);
      const cy = parseValue(node.getAttribute('cy'), inherited?.cy ?? 50, gradientUnits);
      const r = parseValue(node.getAttribute('r'), inherited?.r ?? 50, gradientUnits);
      const fx = parseValue(node.getAttribute('fx'), inherited?.fx ?? cx, gradientUnits);
      const fy = parseValue(node.getAttribute('fy'), inherited?.fy ?? cy, gradientUnits);
      Object.assign(baseDef, { cx, cy, r, fx, fy });
    }

    const knownGradientAttrs = new Set([
      'id',
      'href',
      'xlink:href',
      'gradientunits',
      'x1',
      'y1',
      'x2',
      'y2',
      'cx',
      'cy',
      'r',
      'fx',
      'fy',
    ]);
    const extraAttributes = {
      ...(inherited?.extraAttributes ?? {}),
      ...collectExtraAttributes(node, knownGradientAttrs),
    };
    if (Object.keys(extraAttributes).length > 0) {
      baseDef.extraAttributes = extraAttributes;
    }

    // For userSpaceOnUse gradients, store the raw SVG content so coordinates
    // are preserved correctly relative to the original element positions
    if (gradientUnits === 'userSpaceOnUse') {
      baseDef.rawContent = node.outerHTML;
    }

    resolved.set(nodeId, baseDef);
    resolving.delete(nodeId);
    return baseDef;
  };

  gradientNodes.forEach((node) => {
    const def = resolveGradient(node);
    if (def) {
      resolved.set(def.id, def);
    }
  });

  const defs = Array.from(resolved.values());
  return defs.length > 0 ? { gradients: defs } : null;
};

/**
 * Render animation elements for gradients (stop color, transform, etc.)
 */
const renderGradientAnimationElements = (
  _gradientId: string,
  gradientAnimations: SVGAnimation[],
  chainDelays: Map<string, number>,
  restartKey: number = 0,
  allowRender: boolean = true
) => {
  if (!allowRender) return null;
  // Get unique animations (same dedup logic as clipPath)
  const unique: SVGAnimation[] = [];
  const seen = new Set<string>();
  gradientAnimations.forEach((anim) => {
    const signature = [
      anim.type,
      anim.attributeName ?? '',
      anim.gradientTargetId ?? '',
      anim.stopIndex ?? '',
      anim.begin ?? '',
      anim.dur ?? '',
      anim.values ?? '',
      anim.from ?? '',
      anim.to ?? '',
    ].join('|');
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(anim);
    }
  });

  return unique.map((anim) => {
    const delayMs = chainDelays.get(anim.id) ?? 0;
    const beginValue = !allowRender
      ? 'indefinite'
      : delayMs > 0
        ? `${(delayMs / 1000).toFixed(3)}s`
        : (anim.begin ?? '0s');

    const commonProps = {
      dur: anim.dur ?? '2s',
      begin: beginValue,
      end: anim.end,
      fill: anim.fill ?? 'freeze',
      repeatCount: anim.repeatCount,
      repeatDur: anim.repeatDur,
      calcMode: anim.calcMode ?? 'linear',
      keyTimes: anim.keyTimes,
      keySplines: anim.keySplines,
    };

    switch (anim.type) {
      case 'animate':
        return (
          <animate
            key={`${anim.id}-${restartKey}`}
            attributeName={anim.attributeName}
            values={anim.values}
            from={anim.from as string | number | undefined}
            to={anim.to as string | number | undefined}
            additive={anim.additive ?? 'replace'}
            accumulate={anim.accumulate ?? 'none'}
            {...commonProps}
          />
        );
      case 'animateTransform':
        return (
          <animateTransform
            key={`${anim.id}-${restartKey}`}
            attributeName={anim.attributeName ?? 'gradientTransform'}
            type={anim.transformType ?? 'translate'}
            values={anim.values}
            from={anim.from as string | number | undefined}
            to={anim.to as string | number | undefined}
            additive={anim.additive ?? 'replace'}
            accumulate={anim.accumulate ?? 'none'}
            {...commonProps}
          />
        );
      case 'set':
        return (
          <set
            key={`${anim.id}-${restartKey}`}
            attributeName={anim.attributeName}
            to={anim.to as string | number | undefined}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  });
};

/**
 * Serialize gradient animation to SVG markup
 */
const serializeGradientAnimation = (anim: SVGAnimation, chainDelays: Map<string, number>): string => {
  const delayMs = chainDelays.get(anim.id) ?? 0;
  const beginValue = delayMs > 0 ? `${(delayMs / 1000).toFixed(3)}s` : (anim.begin ?? '0s');

  const commonAttrs = [
    `dur="${anim.dur ?? '2s'}"`,
    `begin="${beginValue}"`,
    anim.end ? `end="${anim.end}"` : null,
    `fill="${anim.fill ?? 'freeze'}"`,
    anim.repeatCount !== undefined ? `repeatCount="${anim.repeatCount}"` : null,
    anim.repeatDur ? `repeatDur="${anim.repeatDur}"` : null,
    `calcMode="${anim.calcMode ?? 'linear'}"`,
    anim.keyTimes ? `keyTimes="${anim.keyTimes}"` : null,
    anim.keySplines ? `keySplines="${anim.keySplines}"` : null,
  ].filter(Boolean).join(' ');

  switch (anim.type) {
    case 'animate': {
      const attrs = [
        `attributeName="${anim.attributeName}"`,
        commonAttrs,
        anim.values ? `values="${anim.values}"` : null,
        anim.from !== undefined ? `from="${anim.from}"` : null,
        anim.to !== undefined ? `to="${anim.to}"` : null,
        `additive="${anim.additive ?? 'replace'}"`,
        `accumulate="${anim.accumulate ?? 'none'}"`,
      ].filter(Boolean).join(' ');
      return `<animate ${attrs} />`;
    }
    case 'animateTransform': {
      const attrs = [
        `attributeName="${anim.attributeName ?? 'gradientTransform'}"`,
        `type="${anim.transformType ?? 'translate'}"`,
        commonAttrs,
        anim.values ? `values="${anim.values}"` : null,
        anim.from !== undefined ? `from="${anim.from}"` : null,
        anim.to !== undefined ? `to="${anim.to}"` : null,
        `additive="${anim.additive ?? 'replace'}"`,
        `accumulate="${anim.accumulate ?? 'none'}"`,
      ].filter(Boolean).join(' ');
      return `<animateTransform ${attrs} />`;
    }
    case 'set': {
      const attrs = [
        `attributeName="${anim.attributeName}"`,
        `to="${anim.to}"`,
        commonAttrs,
      ].filter(Boolean).join(' ');
      return `<set ${attrs} />`;
    }
    default:
      return '';
  }
};

const normalizeHrefId = (value?: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
};

const formatHrefAttribute = (value?: string): string | undefined => {
  const normalized = normalizeHrefId(value);
  return normalized ? `#${normalized}` : undefined;
};

const collectReferencedGradientIds = (gradient: GradientDef): string[] => {
  const refs: string[] = [];
  const pushRef = (candidate?: unknown) => {
    const normalized = normalizeHrefId(candidate);
    if (normalized) refs.push(normalized);
  };

  pushRef(gradient.href);

  const extra = gradient.extraAttributes as Record<string, unknown> | undefined;
  if (extra) {
    pushRef(extra.href);
    pushRef(extra['xlink:href']);
  }

  if (gradient.rawContent) {
    const regex = /(?:xlink:)?href="#([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(gradient.rawContent)) !== null) {
      pushRef(match[1]);
    }
  }

  return refs;
};

const expandGradientUsageWithReferences = (gradients: GradientDef[], baseIds: Set<string>): Set<string> => {
  const byId = new Map(gradients.map((g) => [g.id, g]));
  const result = new Set(baseIds);
  const queue = Array.from(result);

  while (queue.length > 0) {
    const currentId = queue.pop();
    if (!currentId) continue;
    const gradient = byId.get(currentId);
    if (!gradient) continue;

    collectReferencedGradientIds(gradient).forEach((refId) => {
      if (!result.has(refId)) {
        result.add(refId);
        queue.push(refId);
      }
    });
  }

  return result;
};

type GradientPaint = CustomPaint<GradientDef>;

const renderGradientPreviewDef = (gradient: GradientDef, id: string) => {
  if (gradient.rawContent) {
    // Use GradientSvgContent to properly parse and insert the gradient element
    return (
      <GradientSvgContent
        key={id}
        content={gradient.rawContent.replace(gradient.id, id)}
        gradientKey={id}
      />
    );
  }

  const hrefAttr = formatHrefAttribute(gradient.href);
  const extraGradientProps = gradient.extraAttributes ?? {};
  const useAbsolute = gradient.gradientUnits === 'userSpaceOnUse';
  const formatValue = (value: number | undefined, fallback: number) =>
    useAbsolute ? (value ?? fallback) : `${value ?? fallback}%`;

  if (gradient.type === 'radial') {
    return (
      <radialGradient
        id={id}
        key={id}
        gradientUnits={gradient.gradientUnits}
        cx={formatValue(gradient.cx, 50)}
        cy={formatValue(gradient.cy, 50)}
        r={formatValue(gradient.r, 50)}
        fx={formatValue(gradient.fx ?? gradient.cx, gradient.cx ?? 50)}
        fy={formatValue(gradient.fy ?? gradient.cy, gradient.cy ?? 50)}
        href={hrefAttr}
        xlinkHref={hrefAttr}
        {...extraGradientProps}
      >
        {gradient.stops.map((stop, idx) => {
          const extraStopProps = stop.extraAttributes ?? {};
          return (
            <stop key={`${id}-stop-${idx}`} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity={stop.opacity} {...extraStopProps} />
          );
        })}
      </radialGradient>
    );
  }

  const { x1, y1, x2, y2 } = resolveLinearGradientCoordinates(gradient);

  return (
    <linearGradient
      id={id}
      key={id}
      gradientUnits={gradient.gradientUnits}
      x1={formatValue(x1, 0)}
      y1={formatValue(y1, 0)}
      x2={formatValue(x2, 100)}
      y2={formatValue(y2, 0)}
      href={hrefAttr}
      xlinkHref={hrefAttr}
      {...extraGradientProps}
    >
      {gradient.stops.map((stop, idx) => {
        const extraStopProps = stop.extraAttributes ?? {};
        return (
          <stop key={`${id}-stop-${idx}`} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity={stop.opacity} {...extraStopProps} />
        );
      })}
    </linearGradient>
  );
};

paintTypeRegistry.register<GradientDef>({
  kind: 'gradient',
  getPaintValue: (paint, options) => {
    const custom = paint as CustomPaint<GradientDef>;
    return `url(#${options?.idOverride ?? custom.id})`;
  },
  ensureDefinition: (paint, store) => {
    const custom = paint as CustomPaint<GradientDef>;
    const gradientState = store as unknown as GradientsSlice;
    const gradients = gradientState.gradients ?? [];
    if (gradients.some((g) => g.id === custom.id)) return;
    const addGradient = gradientState.addGradient;
    if (addGradient && custom.payload) {
      addGradient({ ...(custom.payload as GradientDef), id: custom.id });
    }
  },
  renderSwatchDef: (paint, { localId, store }) => {
    const custom = paint as CustomPaint<GradientDef>;
    const gradientState = store as unknown as GradientsSlice;
    const gradients = gradientState.gradients ?? [];
    const gradient = gradients.find((g) => g.id === custom.id) ?? (custom.payload as GradientDef | undefined);
    if (!gradient) return null;
    return renderGradientPreviewDef(gradient, localId);
  },
});

/**
 * paintContributionRegistry: Used for UI components (paint picker, swatches).
 * - renderPicker: Renders the gradient picker in the sidebar paint selection UI
 * - renderDefs: Renders gradient definitions for UI previews (swatches, picker thumbnails)
 * - serializeDefs: Not used for canvas rendering, only for UI preview serialization
 * 
 * This is SEPARATE from defsContributionRegistry which handles actual canvas rendering.
 */
paintContributionRegistry.register({
  id: 'gradients',
  label: 'Gradient',
  renderPicker: (props) => React.createElement(GradientPicker, props),
  renderDefs: () => {
    return <GradientDefs />;
  },
  serializeDefs: (state, usedIds) => {
    const gradients = (state as unknown as GradientsSlice).gradients ?? [];
    const maskState = state as unknown as MasksSlice;
    const maskContents = [...(maskState.masks ?? []), ...(maskState as unknown as { importedMasks?: MasksSlice['masks'] }).importedMasks ?? []]
      .map((m) => m?.content ?? '')
      .filter(Boolean);
    const maskGradientIds = new Set<string>();
    maskContents.forEach((content) => {
      const regex = /url\(#([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        maskGradientIds.add(match[1]);
      }
    });
    const initialUsed = new Set<string>([...Array.from(usedIds), ...Array.from(maskGradientIds)]);
    const expandedUsed = expandGradientUsageWithReferences(gradients, initialUsed);
    const filtered = gradients.filter((g) => expandedUsed.has(g.id));
    if (!filtered.length) return [];
    return filtered.map((g) => {
      if (g.rawContent) {
        return g.rawContent;
      }
      const useAbsolute = g.gradientUnits === 'userSpaceOnUse';
      const formatValue = (val: number | undefined, defaultVal: number) =>
        useAbsolute ? (val ?? defaultVal) : `${val ?? defaultVal}%`;
      const gradientUnitsAttr = g.gradientUnits ? ` gradientUnits="${g.gradientUnits}"` : '';
      const hrefAttr = formatHrefAttribute(g.href);
      const hrefSerialized = hrefAttr ? ` href="${hrefAttr}"` : '';
      const stops = g.stops
        .map((s) => {
          const opacityAttr = s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : '';
          const extraStopAttr = s.extraAttributes
            ? Object.entries(s.extraAttributes)
                .map(([k, v]) => ` ${k}="${String(v)}"`)
                .join('')
            : '';
          return `<stop offset="${s.offset}%" stop-color="${s.color}"${opacityAttr}${extraStopAttr} />`;
        })
        .join('');
      const extraGradientAttr = g.extraAttributes
        ? Object.entries(g.extraAttributes)
            .map(([k, v]) => ` ${k}="${String(v)}"`)
            .join('')
        : '';
      if (g.type === 'radial') {
        return `<radialGradient id="${g.id}"${gradientUnitsAttr}${hrefSerialized}${extraGradientAttr} cx="${formatValue(g.cx, 50)}" cy="${formatValue(g.cy, 50)}" r="${formatValue(g.r, 50)}" fx="${formatValue(g.fx ?? g.cx, 50)}" fy="${formatValue(g.fy ?? g.cy, 50)}">${stops}</radialGradient>`;
      }
      const { x1, y1, x2, y2 } = resolveLinearGradientCoordinates(g);
      return `<linearGradient id="${g.id}"${gradientUnitsAttr}${hrefSerialized}${extraGradientAttr} x1="${formatValue(x1, 0)}" y1="${formatValue(y1, 0)}" x2="${formatValue(x2, 100)}" y2="${formatValue(y2, 0)}">${stops}</linearGradient>`;
    });
  },
});

/**
 * defsContributionRegistry: Used for actual canvas rendering and SVG export.
 * - collectUsedIds: Gathers all gradient IDs referenced by canvas elements
 * - renderDefs: Renders gradient <defs> in the main canvas SVG (with animation support)
 * - serializeDefs: Generates gradient markup for SVG export
 * 
 * This is the MAIN registry for canvas rendering. It handles:
 * - Gradient-level animations (transforms, color changes)
 * - Stop-level animations (stop-color, stop-opacity)
 * - Restart key for animation replay
 */
defsContributionRegistry.register({
  id: 'gradients',
  collectUsedIds: (elements) => collectUsedPaintIds(elements),
  renderDefs: (state, usedIds) => {
    const gradientState = state as unknown as GradientsSlice & AnimationPluginSlice;
    const gradients = gradientState.gradients ?? [];
    const animations = gradientState.animations ?? [];
    const chainDelays = gradientState.calculateChainDelays ? gradientState.calculateChainDelays() : new Map<string, number>();
    // Allow render when playing, has played, or workspace is open (consistent with renderAnimationsForElement)
    const isActive = (gradientState.animationState?.isPlaying ?? false) || 
                     (gradientState.animationState?.hasPlayed ?? false) ||
                     (gradientState.animationState?.isWorkspaceOpen ?? false);
    const restartKey = gradientState.animationState?.restartKey ?? 0;

    const maskState = state as unknown as MasksSlice;
    const maskContents = [...(maskState.masks ?? []), ...(maskState as unknown as { importedMasks?: MasksSlice['masks'] }).importedMasks ?? []]
      .map((m) => m?.content ?? '')
      .filter(Boolean);
    const maskGradientIds = new Set<string>();
    maskContents.forEach((content) => {
      const regex = /url\(#([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        maskGradientIds.add(match[1]);
      }
    });
    const initialUsed = new Set<string>([...Array.from(usedIds), ...Array.from(maskGradientIds)]);
    const used = expandGradientUsageWithReferences(gradients, initialUsed);
    
    return (
      <>
        {gradients
          .filter((g) => used.has(g.id))
          .map((g) => {
            // For raw gradients, use GradientSvgContent to properly parse and insert the gradient element
            if (g.rawContent) {
              return <GradientSvgContent key={g.id} content={g.rawContent} gradientKey={g.id} />;
            }
            const hrefAttr = formatHrefAttribute(g.href);
            const extraGradientProps = g.extraAttributes ?? {};
            const useAbsolute = g.gradientUnits === 'userSpaceOnUse';
            const formatValue = (val: number | undefined, defaultVal: number) =>
              useAbsolute ? (val ?? defaultVal) : `${val ?? defaultVal}%`;

            // Get animations for this gradient
            const gradientAnimations = animations.filter((anim) => anim.gradientTargetId === g.id);
            // Split animations by target: gradient-level (transforms) vs stop-level
            const gradientLevelAnims = gradientAnimations.filter((a) => a.stopIndex === undefined);
            const stopAnimsMap = new Map<number, SVGAnimation[]>();
            gradientAnimations.forEach((a) => {
              if (a.stopIndex !== undefined) {
                const existing = stopAnimsMap.get(a.stopIndex) ?? [];
                existing.push(a);
                stopAnimsMap.set(a.stopIndex, existing);
              }
            });

            if (g.type === 'radial') {
              return (
                <radialGradient
                  id={g.id}
                  key={g.id}
                  gradientUnits={g.gradientUnits}
                  cx={formatValue(g.cx, 50)}
                  cy={formatValue(g.cy, 50)}
                  r={formatValue(g.r, 50)}
                  fx={formatValue(g.fx ?? g.cx, 50)}
                  fy={formatValue(g.fy ?? g.cy, 50)}
                  href={hrefAttr}
                  xlinkHref={hrefAttr}
                  {...extraGradientProps}
                >
                  {g.stops.map((s, idx) => {
                  const stopAnims = stopAnimsMap.get(idx) ?? [];
                  const extraStopProps = s.extraAttributes ?? {};
                  return (
                    <stop key={`${g.id}-stop-${idx}`} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={s.opacity} {...extraStopProps}>
                      {renderGradientAnimationElements(g.id, stopAnims, chainDelays, restartKey, isActive)}
                    </stop>
                  );
                })}
                {renderGradientAnimationElements(g.id, gradientLevelAnims, chainDelays, restartKey, isActive)}
              </radialGradient>
            );
          }
            const { x1, y1, x2, y2 } = resolveLinearGradientCoordinates(g);
            return (
              <linearGradient
                id={g.id}
                key={g.id}
                gradientUnits={g.gradientUnits}
                x1={formatValue(x1, 0)}
                y1={formatValue(y1, 0)}
                x2={formatValue(x2, 100)}
                y2={formatValue(y2, 0)}
                href={hrefAttr}
                xlinkHref={hrefAttr}
              {...extraGradientProps}
              >
                {g.stops.map((s, idx) => {
                  const stopAnims = stopAnimsMap.get(idx) ?? [];
                  const extraStopProps = s.extraAttributes ?? {};
                  return (
                    <stop key={`${g.id}-stop-${idx}`} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={s.opacity} {...extraStopProps}>
                      {renderGradientAnimationElements(g.id, stopAnims, chainDelays, restartKey, isActive)}
                    </stop>
                  );
                })}
                {renderGradientAnimationElements(g.id, gradientLevelAnims, chainDelays, restartKey, isActive)}
              </linearGradient>
            );
          })}
      </>
    );
  },
  serializeDefs: (state, usedIds) => {
    const gradientState = state as unknown as GradientsSlice & AnimationPluginSlice;
    const gradients = gradientState.gradients ?? [];
    const animations = gradientState.animations ?? [];
    const chainDelays = gradientState.calculateChainDelays ? gradientState.calculateChainDelays() : new Map<string, number>();
    
    // Also scan mask contents for gradient references (same as renderDefs)
    const maskState = state as unknown as MasksSlice;
    const maskContents = [...(maskState.masks ?? []), ...(maskState as unknown as { importedMasks?: MasksSlice['masks'] }).importedMasks ?? []]
      .map((m) => m?.content ?? '')
      .filter(Boolean);
    const maskGradientIds = new Set<string>();
    maskContents.forEach((content) => {
      const regex = /url\(#([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        maskGradientIds.add(match[1]);
      }
    });
    const initialUsed = new Set<string>([...Array.from(usedIds), ...Array.from(maskGradientIds)]);
    
    const expandedUsed = expandGradientUsageWithReferences(gradients, initialUsed);
    const filtered = gradients.filter((g) => expandedUsed.has(g.id));
    if (!filtered.length) return [];
    return filtered
      .map((g) => {
        const useAbsolute = g.gradientUnits === 'userSpaceOnUse';
        const formatValue = (val: number | undefined, defaultVal: number) =>
          useAbsolute ? (val ?? defaultVal) : `${val ?? defaultVal}%`;
        const gradientUnitsAttr = g.gradientUnits ? ` gradientUnits="${g.gradientUnits}"` : '';
        const hrefAttr = formatHrefAttribute(g.href);
        const hrefSerialized = hrefAttr ? ` href="${hrefAttr}"` : '';
        
        // Get animations for this gradient
        const gradientAnimations = animations.filter((anim) => anim.gradientTargetId === g.id);
        const gradientLevelAnims = gradientAnimations.filter((a) => a.stopIndex === undefined);
        const stopAnimsMap = new Map<number, SVGAnimation[]>();
        gradientAnimations.forEach((a) => {
          if (a.stopIndex !== undefined) {
            const existing = stopAnimsMap.get(a.stopIndex) ?? [];
            existing.push(a);
            stopAnimsMap.set(a.stopIndex, existing);
          }
        });
        
        const stops = g.stops
          .map((s, idx) => {
            const stopAnims = stopAnimsMap.get(idx) ?? [];
            const animMarkup = stopAnims.map((a) => serializeGradientAnimation(a, chainDelays)).join('\n');
            const opacityAttr = s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : '';
            const extraStopAttr = s.extraAttributes
              ? Object.entries(s.extraAttributes)
                  .map(([k, v]) => ` ${k}="${String(v)}"`)
                  .join('')
              : '';
            if (animMarkup) {
              return `<stop offset="${s.offset}%" stop-color="${s.color}"${opacityAttr}${extraStopAttr}>\n${animMarkup}\n</stop>`;
            }
            return `<stop offset="${s.offset}%" stop-color="${s.color}"${opacityAttr}${extraStopAttr} />`;
          })
          .join('\n');

        const gradientAnimMarkup = gradientLevelAnims.map((a) => serializeGradientAnimation(a, chainDelays)).join('\n');
        const extraGradientAttr = g.extraAttributes
          ? Object.entries(g.extraAttributes)
              .map(([k, v]) => ` ${k}="${String(v)}"`)
              .join('')
          : '';
        
        if (g.type === 'radial') {
          return `<radialGradient id="${g.id}"${gradientUnitsAttr}${hrefSerialized}${extraGradientAttr} cx="${formatValue(g.cx, 50)}" cy="${formatValue(g.cy, 50)}" r="${formatValue(g.r, 50)}" fx="${formatValue(g.fx ?? g.cx, 50)}" fy="${formatValue(g.fy ?? g.cy, 50)}">\n${stops}${gradientAnimMarkup ? '\n' + gradientAnimMarkup : ''}\n</radialGradient>`;
        }
        const { x1, y1, x2, y2 } = resolveLinearGradientCoordinates(g);
        return `<linearGradient id="${g.id}"${gradientUnitsAttr}${hrefSerialized}${extraGradientAttr} x1="${formatValue(x1, 0)}" y1="${formatValue(y1, 0)}" x2="${formatValue(x2, 100)}" y2="${formatValue(y2, 0)}">\n${stops}${gradientAnimMarkup ? '\n' + gradientAnimMarkup : ''}\n</linearGradient>`;
      });
  },
});

const GradientDefs: React.FC = () => {
  const gradients = useCanvasStore((state) => (state as unknown as GradientsSlice).gradients ?? []);
  return (
    <>
      {gradients.map((g) => {
        const useAbsolute = g.gradientUnits === 'userSpaceOnUse';
        const formatValue = (val: number | undefined, defaultVal: number) =>
          useAbsolute ? (val ?? defaultVal) : `${val ?? defaultVal}%`;
        const hrefAttr = formatHrefAttribute(g.href);
        const extraGradientProps = g.extraAttributes ?? {};

        if (g.type === 'radial') {
          return (
            <radialGradient
              id={g.id}
              key={g.id}
              gradientUnits={g.gradientUnits}
              cx={formatValue(g.cx, 50)}
              cy={formatValue(g.cy, 50)}
              r={formatValue(g.r, 50)}
              fx={formatValue(g.fx ?? g.cx, 50)}
              fy={formatValue(g.fy ?? g.cy, 50)}
              href={hrefAttr}
              xlinkHref={hrefAttr}
              {...extraGradientProps}
            >
              {g.stops.map((s, idx) => {
                const extraStopProps = s.extraAttributes ?? {};
                return (
                  <stop
                    key={`${g.id}-stop-${idx}`}
                    offset={`${s.offset}%`}
                    stopColor={s.color}
                    stopOpacity={s.opacity}
                    {...extraStopProps}
                  />
                );
              })}
            </radialGradient>
          );
        }
        const { x1, y1, x2, y2 } = resolveLinearGradientCoordinates(g);
        return (
          <linearGradient
            id={g.id}
            key={g.id}
            gradientUnits={g.gradientUnits}
            x1={formatValue(x1, 0)}
            y1={formatValue(y1, 0)}
            x2={formatValue(x2, 100)}
            y2={formatValue(y2, 0)}
              href={hrefAttr}
              xlinkHref={hrefAttr}
            {...extraGradientProps}
          >
            {g.stops.map((s, idx) => {
              const extraStopProps = s.extraAttributes ?? {};
              return (
                <stop
                  key={`${g.id}-stop-${idx}`}
                  offset={`${s.offset}%`}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                  {...extraStopProps}
                />
              );
            })}
          </linearGradient>
        );
      })}
    </>
  );
};

const GRADIENT_PRESETS: Preset[] = [
  {
    id: 'gradient-sunrise',
    name: 'Sunrise Gradient',
    strokeWidth: 2.5,
    strokeColor: '#f97316',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-gradient-sunrise)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'gradient',
      id: 'preset-gradient-sunrise',
      payload: {
        id: 'preset-gradient-sunrise',
        name: 'Sunrise Gradient',
        type: 'linear',
        angle: 90,
        stops: [
          { offset: 0, color: '#f97316' },
          { offset: 50, color: '#fb7185' },
          { offset: 100, color: '#facc15' },
        ],
        preset: true,
      },
    } satisfies GradientPaint,
  },
  {
    id: 'gradient-oceanic',
    name: 'Oceanic Gradient',
    strokeWidth: 2.5,
    strokeColor: '#0ea5e9',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-gradient-oceanic)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'gradient',
      id: 'preset-gradient-oceanic',
      payload: {
        id: 'preset-gradient-oceanic',
        name: 'Oceanic Gradient',
        type: 'linear',
        angle: 60,
        stops: [
          { offset: 0, color: '#0ea5e9' },
          { offset: 50, color: '#22d3ee' },
          { offset: 100, color: '#a5b4fc' },
        ],
        preset: true,
      },
    } satisfies GradientPaint,
  },
  {
    id: 'gradient-forest',
    name: 'Forest Gradient',
    strokeWidth: 2.5,
    strokeColor: '#166534',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-gradient-forest)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'gradient',
      id: 'preset-gradient-forest',
      payload: {
        id: 'preset-gradient-forest',
        name: 'Forest Gradient',
        type: 'radial',
        cx: 50,
        cy: 50,
        r: 70,
        stops: [
          { offset: 0, color: '#166534' },
          { offset: 60, color: '#22c55e' },
          { offset: 100, color: '#5eead4' },
        ],
        preset: true,
      },
    } satisfies GradientPaint,
  },
  {
    id: 'gradient-aurora',
    name: 'Aurora Gradient',
    strokeWidth: 2.5,
    strokeColor: '#3b82f6',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-gradient-aurora)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'gradient',
      id: 'preset-gradient-aurora',
      payload: {
        id: 'preset-gradient-aurora',
        name: 'Aurora Gradient',
        type: 'linear',
        angle: 110,
        stops: [
          { offset: 0, color: '#0ea5e9' },
          { offset: 55, color: '#8b5cf6' },
          { offset: 100, color: '#22d3ee' },
        ],
        preset: true,
      },
    } satisfies GradientPaint,
  },
];

const GRADIENT_PRESETS_DARK: Preset[] = GRADIENT_PRESETS.map((preset) => {
  if (preset.strokeColor === 'none' || preset.strokeColor.startsWith('url(')) {
    return preset;
  }
  return {
    ...preset,
    strokeColor: adjustStrokeForDarkMode(preset.strokeColor),
  };
});

stylePresetRegistry.register('gradient-presets', (colorMode) =>
  colorMode === 'dark' ? GRADIENT_PRESETS_DARK : GRADIENT_PRESETS
);

export const gradientsPlugin: PluginDefinition<CanvasStore> = {
  id: 'gradients',
  metadata: {
    label: 'Gradients',
  },
  slices: [gradientsSliceFactory],
  relatedPluginPanels: [
    {
      id: 'gradients-panel',
      targetPlugin: 'library',
      component: GradientsPanel,
      order: 4,
    },
  ],
  importDefs: importGradientDefs,
  svgDefsEditors: [gradientDefsEditor],
};
