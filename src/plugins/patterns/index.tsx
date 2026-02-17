/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import React, { useRef, useLayoutEffect } from 'react';
import { paintContributionRegistry } from '../../utils/paintContributionRegistry';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import type { SvgDefsEditor } from '../../types/plugins';
import { paintTypeRegistry, type CustomPaint } from '../../utils/paintTypeRegistry';
import { stylePresetRegistry, type Preset } from '../../utils/stylePresetRegistry';
import { adjustStrokeForDarkMode } from '../../utils/fillAndStrokePresets';
import { createPatternsSlice, type PatternsSlice, type PatternDef } from './slice';
import { PatternPicker } from './PatternPicker';
import { PatternsPanel } from './PatternsPanel';
import { resolvePatternTileGeometry } from './patternPreviewUtils';
import { useCanvasStore } from '../../store/canvasStore';
import { collectUsedPaintIds } from '../../utils/paintUsageUtils';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { generateShortId } from '../../utils/idGenerator';
import './persistence';
import './importContribution';

/**
 * Component that properly inserts SVG content using the SVG parser.
 * This is necessary because dangerouslySetInnerHTML uses the HTML parser,
 * which treats <path> as a void element and cannot have children like <animate>.
 */
const PatternContent: React.FC<{ content: string }> = ({ content }) => {
  const gRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    if (!gRef.current) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg"><g id="__root__">${content}</g></svg>`,
      'image/svg+xml'
    );

    const root = doc.querySelector('#__root__');
    if (!root) return;

    // Clear existing content
    while (gRef.current.firstChild) {
      gRef.current.removeChild(gRef.current.firstChild);
    }

    // Clone and append each child using importNode (preserves SVG namespace)
    Array.from(root.childNodes).forEach((node) => {
      const imported = document.importNode(node, true);
      gRef.current!.appendChild(imported);
    });
  }, [content]);

  return <g ref={gRef} />;
};

const patternsSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createPatternsSlice(set as any, get as any, api as any);
  return { state: slice };
};

const patternDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'patterns-editor',
  appliesTo: (node) => {
    if (!node.isDefs) return false;
    if (node.tagName === 'pattern') return true;
    return Boolean(node.defsOwnerId);
  },
  mapAttributeNameToDataKey: (name, current) => {
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      'patternunits': 'patternUnits',
      'pattern-units': 'patternUnits',
      'patterntransform': 'patternTransform',
      'pattern-transform': 'patternTransform',
      width: 'width',
      height: 'height',
    };
    const mapped = map[normalized];
    if (mapped) return mapped;
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    if (camel in current) return camel;
    return normalized;
  },
  update: ({ store, node, attrName, rawValue }) => {
    const patternState = store as unknown as PatternsSlice;
    const pattern = (patternState.patterns ?? []).find((p) => p.id === (node.defsOwnerId ?? node.idAttribute));
    const updatePattern = patternState.updatePattern;
    if (!pattern || !updatePattern) return false;
    const current = pattern as unknown as Record<string, unknown>;
    const dataKey = patternDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;
    const existing = current[dataKey];
    let nextValue: unknown = rawValue;
    if (typeof existing === 'number') {
      const parsed = parseFloat(rawValue);
      nextValue = Number.isFinite(parsed) ? parsed : existing;
    } else if (typeof existing === 'boolean') {
      if (rawValue === 'true') nextValue = true;
      else if (rawValue === 'false') nextValue = false;
    }
    updatePattern(pattern.id, { [dataKey]: nextValue });
    return true;
  },
  addAttribute: ({ store, node, attrName, rawValue }) => patternDefsEditor.update({ store, node, attrName, rawValue }),
  removeAttribute: ({ store, node, attrName }) => {
    const patternState = store as unknown as PatternsSlice;
    const pattern = (patternState.patterns ?? []).find((p) => p.id === (node.defsOwnerId ?? node.idAttribute));
    const updatePattern = patternState.updatePattern;
    if (!pattern || !updatePattern) return false;
    const current = pattern as unknown as Record<string, unknown>;
    const dataKey = patternDefsEditor.mapAttributeNameToDataKey?.(attrName, current) ?? attrName;
    const next = { ...pattern } as Record<string, unknown>;
    delete next[dataKey];
    updatePattern(pattern.id, next as Partial<PatternDef>);
    return true;
  },
  removeChild: ({ store, node }) => {
    const patternState = store as unknown as PatternsSlice;
    const pattern = (patternState.patterns ?? []).find((p) => p.id === (node.defsOwnerId ?? node.idAttribute));
    const updatePattern = patternState.updatePattern;
    const removePattern = patternState.removePattern;
    if (!pattern) return false;

    // Delete the pattern itself
    if (node.tagName === 'pattern') {
      removePattern?.(pattern.id);
      return true;
    }

    // If we don't have a concrete child index (likely an animation node), remove the whole pattern
    if (node.childIndex === undefined) {
      removePattern?.(pattern.id);
      return true;
    }

    if (typeof DOMParser === 'undefined') return false;
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<pattern>${pattern.rawContent ?? ''}</pattern>`, 'image/svg+xml');
    const patternEl = doc.querySelector('pattern');
    if (!patternEl) return false;
    const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
    const children = Array.from(patternEl.children).filter((el) => !ANIMATION_TAGS.has(el.tagName.toLowerCase()));
    if (node.childIndex === undefined || node.childIndex < 0 || node.childIndex >= children.length) return false;
    const target = children[node.childIndex];
    target.parentElement?.removeChild(target);
    const nextContent = patternEl.innerHTML;
    updatePattern?.(pattern.id, { rawContent: nextContent });
    return true;
  },
  revisionSelector: (state) => (state as unknown as PatternsSlice).patterns,
};

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

/**
 * Inject animations into pattern rawContent at the correct child element positions.
 * Groups animations by patternChildIndex and injects them into the corresponding elements.
 */
const injectAnimationsIntoPatternContent = (
  rawContent: string,
  patternId: string,
  animations: SVGAnimation[],
  chainDelays: Map<string, number>
): string => {
  // Find animations targeting this pattern's children
  const patternAnimations = animations.filter(
    (anim) => anim.patternTargetId === patternId && anim.patternChildIndex !== undefined
  );
  
  // Separate animations with child index from pattern-level animations
  const patternLevelAnimations = animations.filter(
    (anim) => anim.patternTargetId === patternId && anim.patternChildIndex === undefined
  );
  
  if (patternAnimations.length === 0 && patternLevelAnimations.length === 0) {
    return rawContent;
  }
  
  // Parse content with SVG namespace to preserve proper namespacing
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg"><g id="__wrapper__">${rawContent}</g></svg>`,
    'image/svg+xml'
  );
  if (doc.querySelector('parsererror')) {
    // If parsing fails, fallback to prepending pattern-level animations
    const animMarkup = patternLevelAnimations.map((a) => serializePatternAnimation(a, chainDelays)).join('\n');
    return animMarkup ? `${animMarkup}\n${rawContent}` : rawContent;
  }
  
  const root = doc.querySelector('#__wrapper__');
  if (!root) {
    return rawContent;
  }
  
  // Get non-animation children
  const children = Array.from(root.children).filter(
    (el) => !['animate', 'animatetransform', 'animatemotion', 'animatecolor', 'set'].includes(el.tagName.toLowerCase())
  );
  
  // Group animations by child index
  const animsByChild = new Map<number, SVGAnimation[]>();
  patternAnimations.forEach((anim) => {
    const idx = anim.patternChildIndex!;
    if (!animsByChild.has(idx)) {
      animsByChild.set(idx, []);
    }
    animsByChild.get(idx)!.push(anim);
  });
  
  // Inject animations into each target element
  animsByChild.forEach((anims, childIndex) => {
    const targetElement = children[childIndex];
    if (!targetElement) return;
    
    anims.forEach((anim) => {
      const animHtml = serializePatternAnimation(anim, chainDelays);
      if (animHtml) {
        // Parse with SVG namespace to avoid xmlns="" issues
        const animDoc = parser.parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg">${animHtml}</svg>`,
          'image/svg+xml'
        );
        const animElement = animDoc.querySelector('svg')?.firstElementChild;
        if (animElement) {
          const imported = doc.importNode(animElement, true);
          targetElement.appendChild(imported);
        }
      }
    });
  });
  
  // Serialize result
  const serializer = new XMLSerializer();
  let result = Array.from(root.childNodes)
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        let serialized = serializer.serializeToString(node);
        // Remove spurious xmlns="" attributes that XMLSerializer adds
        serialized = serialized.replace(/ xmlns=""/g, '');
        return serialized;
      }
      return node.textContent ?? '';
    })
    .join('\n      ');
  
  // Add pattern-level animations at the start if any
  if (patternLevelAnimations.length > 0) {
    const animMarkup = patternLevelAnimations.map((a) => serializePatternAnimation(a, chainDelays)).join('\n');
    result = `${animMarkup}\n${result}`;
  }
  
  return result;
};

const importPatternDefs = (doc: Document): Record<string, PatternDef[]> | null => {
  const patterns = Array.from(doc.querySelectorAll('pattern'));
  if (!patterns.length) return null;

  const defs: PatternDef[] = [];

  patterns.forEach((node) => {
    const id = node.getAttribute('id') ?? generateShortId('ptn');
    const width = parseFloat(node.getAttribute('width') ?? '10');
    const height = parseFloat(node.getAttribute('height') ?? '10');
    const size = Math.max(width, height);

    const patternUnits = (node.getAttribute('patternUnits') ?? 'objectBoundingBox') as 'userSpaceOnUse' | 'objectBoundingBox';
    const patternTransform = node.getAttribute('patternTransform') ?? undefined;

    defs.push({
      id,
      name: id,
      size,
      fg: '#000000',
      bg: '#ffffff',
      type: 'raw',
      width,
      height,
      patternUnits,
      patternTransform,
      // Strip animations - they are imported separately by the animation system
      rawContent: stripAnimationsFromContent(node),
    });
  });

  return defs.length > 0 ? { pattern: defs } : null;
};

/**
 * Serialize pattern animation to SVG markup
 */
const serializePatternAnimation = (anim: SVGAnimation, chainDelays: Map<string, number>): string => {
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
        `attributeName="${anim.attributeName ?? 'patternTransform'}"`,
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

type PatternPaint = CustomPaint<PatternDef>;

const renderPatternPreviewDef = (pattern: PatternDef, id: string) => {
  const geometry = resolvePatternTileGeometry(pattern);
  const width = geometry.contentWidth;
  const height = geometry.contentHeight;
  const commonProps = {
    id,
    patternUnits: geometry.units,
    width: geometry.tileWidth,
    height: geometry.tileHeight,
    ...(geometry.viewBox ? { viewBox: geometry.viewBox } : {}),
    ...(pattern.patternTransform ? { patternTransform: pattern.patternTransform } : {}),
  };

  if (pattern.type === 'raw' && pattern.rawContent) {
    return (
      <pattern
        key={id}
        {...commonProps}
        dangerouslySetInnerHTML={{ __html: pattern.rawContent }}
      />
    );
  }

  if (pattern.type === 'dots') {
    return (
      <pattern key={id} {...commonProps}>
        <rect width={width} height={height} fill={pattern.bg} />
        <circle cx={width / 2} cy={height / 2} r={pattern.size / 3} fill={pattern.fg} />
      </pattern>
    );
  }

  if (pattern.type === 'grid') {
    return (
      <pattern key={id} {...commonProps}>
        <rect width={width} height={height} fill={pattern.bg} />
        <path
          d={`M0 0 H${width} V${height} H0 Z`}
          fill="none"
          stroke={pattern.fg}
          strokeWidth={Math.max(1, pattern.size / 10)}
        />
      </pattern>
    );
  }

  if (pattern.type === 'crosshatch') {
    return (
      <pattern key={id} {...commonProps} patternTransform={pattern.patternTransform ?? 'rotate(45)'}>
        <rect width={width} height={height} fill={pattern.bg} />
        <rect width={Math.max(1, pattern.size / 4)} height={height} fill={pattern.fg} />
      </pattern>
    );
  }

  if (pattern.type === 'checker') {
    return (
      <pattern key={id} {...commonProps}>
        <rect width={width} height={height} fill={pattern.bg} />
        <rect width={pattern.size / 2} height={pattern.size / 2} fill={pattern.fg} />
        <rect x={pattern.size / 2} y={pattern.size / 2} width={pattern.size / 2} height={pattern.size / 2} fill={pattern.fg} />
      </pattern>
    );
  }

  if (pattern.type === 'diamonds') {
    return (
      <pattern key={id} {...commonProps}>
        <rect width={width} height={height} fill={pattern.bg} />
        <path d={`M${pattern.size / 2} 0 L ${pattern.size} ${pattern.size / 2} L ${pattern.size / 2} ${pattern.size} L 0 ${pattern.size / 2} Z`} fill={pattern.fg} />
      </pattern>
    );
  }

  return (
    <pattern key={id} {...commonProps} patternTransform={pattern.patternTransform ?? 'rotate(45)'}>
      <rect width={width} height={height} fill={pattern.bg} />
      <rect width={pattern.size / 2} height={height} fill={pattern.fg} />
    </pattern>
  );
};

paintTypeRegistry.register<PatternDef>({
  kind: 'pattern',
  getPaintValue: (paint, options) => {
    const custom = paint as CustomPaint<PatternDef>;
    return `url(#${options?.idOverride ?? custom.id})`;
  },
  ensureDefinition: (paint, store) => {
    const custom = paint as CustomPaint<PatternDef>;
    const patternState = store as unknown as PatternsSlice;
    const patterns = patternState.patterns ?? [];
    if (patterns.some((p) => p.id === custom.id)) return;
    const addPattern = patternState.addPattern;
    if (addPattern && custom.payload) {
      addPattern({ ...(custom.payload as PatternDef), id: custom.id });
    }
  },
  renderSwatchDef: (paint, { localId, store }) => {
    const custom = paint as CustomPaint<PatternDef>;
    const patternState = store as unknown as PatternsSlice;
    const patterns = patternState.patterns ?? [];
    const pattern = patterns.find((p) => p.id === custom.id) ?? (custom.payload as PatternDef | undefined);
    if (!pattern) return null;
    return renderPatternPreviewDef(pattern, localId);
  },
});

/**
 * paintContributionRegistry: Used for UI components (paint picker, swatches).
 * - renderPicker: Renders the pattern picker in the sidebar paint selection UI
 * - renderDefs: Renders pattern definitions for UI previews (swatches, picker thumbnails)
 * - serializeDefs: Not used for canvas rendering, only for UI preview serialization
 * 
 * This is SEPARATE from defsContributionRegistry which handles actual canvas rendering.
 */
paintContributionRegistry.register({
  id: 'patterns',
  label: 'Pattern',
  renderPicker: (props) => React.createElement(PatternPicker, props),
  renderDefs: () => <PatternDefs />,
  serializeDefs: (state, usedIds) => {
    const patterns = (state as unknown as PatternsSlice).patterns ?? [];
    return patterns
      .filter((p) => usedIds.has(p.id))
      .map((p) => {
        const { id, size, fg, bg, type } = p;
        const geometry = resolvePatternTileGeometry(p);
        const viewBoxAttr = geometry.viewBox ? ` viewBox="${geometry.viewBox}"` : '';
        switch (type) {
          case 'dots':
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}>
  <rect width="${size}" height="${size}" fill="${bg}" />
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="${fg}" />
</pattern>`;
          case 'grid':
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}>
  <rect width="${size}" height="${size}" fill="${bg}" />
  <path d="M0 0 H${size} V${size} H0 Z" fill="none" stroke="${fg}" stroke-width="${Math.max(1, size / 10)}" />
</pattern>`;
          case 'crosshatch':
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr} patternTransform="rotate(45)">
  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${Math.max(1, size / 4)}" height="${size}" fill="${fg}" />
</pattern>`;
          case 'checker':
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}>
  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${size / 2}" height="${size / 2}" fill="${fg}" />
  <rect x="${size / 2}" y="${size / 2}" width="${size / 2}" height="${size / 2}" fill="${fg}" />
</pattern>`;
          case 'diamonds':
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}>
  <rect width="${size}" height="${size}" fill="${bg}" />
  <path d="M${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} L 0 ${size / 2} Z" fill="${fg}" />
</pattern>`;
          case 'stripes':
          default:
            return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr} patternTransform="rotate(45)">
  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${size / 2}" height="${size}" fill="${fg}" />
</pattern>`;
        }
      });
  },
});

/**
 * defsContributionRegistry: Used for actual canvas rendering and SVG export.
 * - collectUsedIds: Gathers all pattern IDs referenced by canvas elements
 * - renderDefs: Renders pattern <defs> in the main canvas SVG (with animation support)
 * - serializeDefs: Generates pattern markup for SVG export
 * 
 * This is the MAIN registry for canvas rendering. It handles:
 * - Animation injection into pattern children (using PatternContent for proper SVG parsing)
 * - Pattern-level animations
 * - Restart key for animation replay
 */
defsContributionRegistry.register({
  id: 'patterns',
  collectUsedIds: (elements) => collectUsedPaintIds(elements),
  renderDefs: (state, usedIds) => {
    const patternState = state as unknown as PatternsSlice & AnimationPluginSlice;
    const maskState = state as unknown as import('../masks/types').MasksSlice;
    const maskContents = [...(maskState?.masks ?? []), ...(maskState as unknown as { importedMasks?: import('../masks/types').MasksSlice['masks'] })?.importedMasks ?? []]
      .map((m) => m?.content ?? '')
      .filter(Boolean);
    const maskPatternIds = new Set<string>();
    maskContents.forEach((content) => {
      const regex = /url\(#([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        maskPatternIds.add(match[1]);
      }
    });
    const used = new Set<string>([...Array.from(usedIds), ...Array.from(maskPatternIds)]);
    const patterns = patternState.patterns ?? [];
    const animations = patternState.animations ?? [];
    const chainDelays = patternState.calculateChainDelays ? patternState.calculateChainDelays() : new Map<string, number>();
    const isActive = (patternState.animationState?.isPlaying ?? false)
      || (patternState.animationState?.hasPlayed ?? false)
      || (patternState.animationState?.isWorkspaceOpen ?? false);
    const restartKey = patternState.animationState?.restartKey ?? 0;
    
    const filtered = patterns.filter((p) => used.has(p.id));
    if (!filtered.length) {
      return null;
    }
    return (
      <>
        {filtered.map((p) => {
          const patternAnimations = isActive ? animations.filter((anim) => anim.patternTargetId === p.id) : [];
          const hasPatternChildAnimations = patternAnimations.some((a) => a.patternChildIndex !== undefined);
          const geometry = resolvePatternTileGeometry(p);

          if (p.type === 'raw' && p.rawContent) {
            // If there are animations targeting child elements, inject them properly
            if (hasPatternChildAnimations) {
              const contentWithAnimations = injectAnimationsIntoPatternContent(p.rawContent, p.id, animations, chainDelays);
              return (
                <pattern
                  id={p.id}
                  key={`${p.id}-${restartKey}`}
                  patternUnits={geometry.units}
                  width={geometry.tileWidth}
                  height={geometry.tileHeight}
                  {...(geometry.viewBox ? { viewBox: geometry.viewBox } : {})}
                  {...(p.patternTransform ? { patternTransform: p.patternTransform } : {})}
                >
                  <PatternContent content={contentWithAnimations} />
                </pattern>
              );
            }
            
            // For pattern-level animations only, prepend to content
            const patternLevelAnimations = patternAnimations.filter((a) => a.patternChildIndex === undefined);
            const animMarkup = patternLevelAnimations.map((a) => serializePatternAnimation(a, chainDelays)).join('\n');
            const animBlock = animMarkup ? `${animMarkup}\n` : '';
            const inner = `${animBlock}${p.rawContent}`;
            return (
              <pattern
                id={p.id}
                key={`${p.id}-${restartKey}`}
                patternUnits={geometry.units}
                width={geometry.tileWidth}
                height={geometry.tileHeight}
                {...(geometry.viewBox ? { viewBox: geometry.viewBox } : {})}
                dangerouslySetInnerHTML={{ __html: inner }}
                {...(p.patternTransform ? { patternTransform: p.patternTransform } : {})}
              />
            );
          }

          const baseBody = (() => {
            switch (p.type) {
              case 'dots':
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<circle cx="${p.size / 2}" cy="${p.size / 2}" r="${p.size / 3}" fill="${p.fg}" />`;
              case 'grid':
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<path d="M0 0 H${p.size} V${p.size} H0 Z" fill="none" stroke="${p.fg}" stroke-width="${Math.max(1, p.size / 10)}" />`;
              case 'crosshatch':
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<rect width="${Math.max(1, p.size / 4)}" height="${p.size}" fill="${p.fg}" />`;
              case 'checker':
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<rect width="${p.size / 2}" height="${p.size / 2}" fill="${p.fg}" />\n<rect x="${p.size / 2}" y="${p.size / 2}" width="${p.size / 2}" height="${p.size / 2}" fill="${p.fg}" />`;
              case 'diamonds':
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<path d="M${p.size / 2} 0 L ${p.size} ${p.size / 2} L ${p.size / 2} ${p.size} L 0 ${p.size / 2} Z" fill="${p.fg}" />`;
              case 'stripes':
              default:
                return `<rect width="${p.size}" height="${p.size}" fill="${p.bg}" />\n<rect width="${p.size / 2}" height="${p.size}" fill="${p.fg}" />`;
            }
          })();

          const transformAttr = p.type === 'stripes' || p.type === 'crosshatch' ? ' patternTransform="rotate(45)"' : '';
          // For non-raw patterns, get pattern-level animations
          const nonRawAnimMarkup = patternAnimations.map((a) => serializePatternAnimation(a, chainDelays)).join('\n');
          const animBlock = nonRawAnimMarkup ? `${nonRawAnimMarkup}\n` : '';
          const inner = `${animBlock}${baseBody}`;

          return (
            <pattern
              id={p.id}
              key={`${p.id}-${restartKey}`}
              patternUnits={geometry.units}
              width={geometry.tileWidth}
              height={geometry.tileHeight}
              {...(geometry.viewBox ? { viewBox: geometry.viewBox } : {})}
              dangerouslySetInnerHTML={{ __html: inner }}
              {...(transformAttr ? { patternTransform: 'rotate(45)' } : {})}
            />
          );
        })}
      </>
    );
  },
  serializeDefs: (state, usedIds) => {
    const patternState = state as unknown as PatternsSlice & AnimationPluginSlice;
    const maskState = state as unknown as import('../masks/types').MasksSlice;
    const maskContents = [...(maskState?.masks ?? []), ...(maskState as unknown as { importedMasks?: import('../masks/types').MasksSlice['masks'] })?.importedMasks ?? []]
      .map((m) => m?.content ?? '')
      .filter(Boolean);
    const maskPatternIds = new Set<string>();
    maskContents.forEach((content) => {
      const regex = /url\(#([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        maskPatternIds.add(match[1]);
      }
    });
    const used = new Set<string>([...Array.from(usedIds), ...Array.from(maskPatternIds)]);
    const patterns = patternState.patterns ?? [];
    const animations = patternState.animations ?? [];
    const chainDelays = patternState.calculateChainDelays ? patternState.calculateChainDelays() : new Map<string, number>();
    
    const filtered = patterns.filter((p) => used.has(p.id));
    if (!filtered.length) {
      return [];
    }
    return filtered
      .map((p) => {
        const { id, size, fg, bg, type } = p;
        const geometry = resolvePatternTileGeometry(p);
        const viewBoxAttr = geometry.viewBox ? ` viewBox="${geometry.viewBox}"` : '';
        
        if (type === 'raw' && p.rawContent) {
          const transformAttr = p.patternTransform ? ` patternTransform="${p.patternTransform}"` : '';
          // Inject animations into the correct child elements
          const contentWithAnimations = injectAnimationsIntoPatternContent(p.rawContent, id, animations, chainDelays);
          return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}${transformAttr}>\n${contentWithAnimations}\n</pattern>`;
        }
        
        // For non-raw patterns, get pattern-level animations only
        const patternLevelAnimations = animations.filter((anim) => anim.patternTargetId === id);
        const animMarkup = patternLevelAnimations.map((a) => serializePatternAnimation(a, chainDelays)).join('\n');
        
        let content = '';
        switch (type) {
          case 'dots':
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="${fg}" />`;
            break;
          case 'grid':
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <path d="M0 0 H${size} V${size} H0 Z" fill="none" stroke="${fg}" stroke-width="${Math.max(1, size / 10)}" />`;
            break;
          case 'crosshatch':
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${Math.max(1, size / 4)}" height="${size}" fill="${fg}" />`;
            break;
          case 'checker':
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${size / 2}" height="${size / 2}" fill="${fg}" />
  <rect x="${size / 2}" y="${size / 2}" width="${size / 2}" height="${size / 2}" fill="${fg}" />`;
            break;
          case 'diamonds':
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <path d="M${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} L 0 ${size / 2} Z" fill="${fg}" />`;
            break;
          case 'stripes':
          default:
            content = `  <rect width="${size}" height="${size}" fill="${bg}" />
  <rect width="${size / 2}" height="${size}" fill="${fg}" />`;
            break;
        }
        
        const transformAttr = (type === 'stripes' || type === 'crosshatch') ? ' patternTransform="rotate(45)"' : '';
        return `<pattern id="${id}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}${transformAttr}>\n${animMarkup ? animMarkup + '\n' : ''}${content}\n</pattern>`;
      });
  },
});

const PatternDefs: React.FC = () => {
  const patterns = useCanvasStore((state) => (state as unknown as PatternsSlice).patterns ?? []);
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const calculateChainDelays = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).calculateChainDelays);
  const animationState = useCanvasStore(useShallow((state) => {
    const animState = state as unknown as AnimationPluginSlice;
    return {
      isPlaying: animState.animationState?.isPlaying,
      hasPlayed: animState.animationState?.hasPlayed,
      isWorkspaceOpen: animState.animationState?.isWorkspaceOpen,
    };
  }));
  
  // Memoize chain delays to avoid creating new Map on every render
  // animations.length is used to trigger recalculation when animations change
  const chainDelays = useMemo(() => {
    return calculateChainDelays ? calculateChainDelays() : new Map<string, number>();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateChainDelays, animations.length]);
  
  // Check if there are any pattern animations
  const hasPatternAnimations = useMemo(() => {
    return animations.some((anim) => anim.patternTargetId !== undefined);
  }, [animations]);
  
  // Inject animations when animation workspace is active OR when there are pattern-specific animations
  const shouldInjectAnimations = animationState?.isPlaying || animationState?.hasPlayed || animationState?.isWorkspaceOpen || hasPatternAnimations;
  
  return (
    <>
      {patterns.map((p) => {
        const geometry = resolvePatternTileGeometry(p);

        if (p.type === 'raw' && p.rawContent) {
          // Inject animations into content if animation system is active
          const content = shouldInjectAnimations 
            ? injectAnimationsIntoPatternContent(p.rawContent, p.id, animations, chainDelays)
            : p.rawContent;
          
          // Check if this pattern has animations that need injection
          const patternHasAnimations = animations.some(
            (a) => a.patternTargetId === p.id
          );
          
          // Use PatternContent for proper SVG parsing when animations are present
          // Otherwise use dangerouslySetInnerHTML for raw content without animations
          if (shouldInjectAnimations && patternHasAnimations) {
            return (
              <pattern
                id={p.id}
                key={p.id}
                patternUnits={geometry.units}
                width={geometry.tileWidth}
                height={geometry.tileHeight}
                viewBox={geometry.viewBox}
                patternTransform={p.patternTransform ?? undefined}
              >
                <PatternContent content={content} />
              </pattern>
            );
          }
          
          return (
            <pattern
              id={p.id}
              key={p.id}
              patternUnits={geometry.units}
              width={geometry.tileWidth}
              height={geometry.tileHeight}
              viewBox={geometry.viewBox}
              patternTransform={p.patternTransform ?? undefined}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }
        return (
          <pattern
            id={p.id}
            key={p.id}
            patternUnits={geometry.units}
            width={geometry.tileWidth}
            height={geometry.tileHeight}
            viewBox={geometry.viewBox}
            patternTransform={p.type === 'stripes' || p.type === 'crosshatch' ? 'rotate(45)' : undefined}
          >
            <rect width={p.size} height={p.size} fill={p.bg} />
            {p.type === 'dots' && <circle cx={p.size / 2} cy={p.size / 2} r={p.size / 3} fill={p.fg} />}
            {p.type === 'grid' && (
              <path d={`M0 0 H${p.size} V${p.size} H0 Z`} fill="none" stroke={p.fg} strokeWidth={Math.max(1, p.size / 10)} />
            )}
            {(p.type === 'stripes' || p.type === 'crosshatch') && (
              <rect width={p.size / 2} height={p.size} fill={p.fg} />
            )}
            {p.type === 'checker' && (
              <>
                <rect width={p.size / 2} height={p.size / 2} fill={p.fg} />
                <rect x={p.size / 2} y={p.size / 2} width={p.size / 2} height={p.size / 2} fill={p.fg} />
              </>
            )}
            {p.type === 'diamonds' && (
              <path d={`M${p.size / 2} 0 L ${p.size} ${p.size / 2} L ${p.size / 2} ${p.size} L 0 ${p.size / 2} Z`} fill={p.fg} />
            )}
          </pattern>
        );
      })}
    </>
  );
};

const PATTERN_PRESETS: Preset[] = [
  {
    id: 'pattern-stripes',
    name: 'Slate Stripes',
    strokeWidth: 1.5,
    strokeColor: '#475569',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-pattern-stripes)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'pattern',
      id: 'preset-pattern-stripes',
      payload: {
        id: 'preset-pattern-stripes',
        name: 'Slate Stripes',
        size: 10,
        fg: '#475569',
        bg: '#e2e8f0',
        type: 'stripes',
        patternTransform: 'rotate(45)',
      },
    } satisfies PatternPaint,
  },
  {
    id: 'pattern-checker',
    name: 'Ink Checker',
    strokeWidth: 1.5,
    strokeColor: '#0f172a',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-pattern-checker)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'pattern',
      id: 'preset-pattern-checker',
      payload: {
        id: 'preset-pattern-checker',
        name: 'Ink Checker',
        size: 12,
        fg: '#0f172a',
        bg: '#e2e8f0',
        type: 'checker',
      },
    } satisfies PatternPaint,
  },
  {
    id: 'pattern-crosshatch',
    name: 'Crosshatch Gray',
    strokeWidth: 1.5,
    strokeColor: '#334155',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-pattern-crosshatch)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'pattern',
      id: 'preset-pattern-crosshatch',
      payload: {
        id: 'preset-pattern-crosshatch',
        name: 'Crosshatch Gray',
        size: 8,
        fg: '#334155',
        bg: '#f8fafc',
        type: 'crosshatch',
        patternTransform: 'rotate(45)',
      },
    } satisfies PatternPaint,
  },
  {
    id: 'pattern-dots',
    name: 'Soft Dots',
    strokeWidth: 1.5,
    strokeColor: '#475569',
    strokeOpacity: 0.9,
    fillColor: 'url(#preset-pattern-dots)',
    fillOpacity: 1,
    fillPaint: {
      kind: 'pattern',
      id: 'preset-pattern-dots',
      payload: {
        id: 'preset-pattern-dots',
        name: 'Soft Dots',
        size: 10,
        fg: '#475569',
        bg: '#e2e8f0',
        type: 'dots',
      },
    } satisfies PatternPaint,
  },
];

const PATTERN_PRESETS_DARK: Preset[] = PATTERN_PRESETS.map((preset) => {
  if (preset.strokeColor === 'none' || preset.strokeColor.startsWith('url(')) {
    return preset;
  }
  return {
    ...preset,
    strokeColor: adjustStrokeForDarkMode(preset.strokeColor),
  };
});

stylePresetRegistry.register('pattern-presets', (colorMode) =>
  colorMode === 'dark' ? PATTERN_PRESETS_DARK : PATTERN_PRESETS
);

export const patternsPlugin: PluginDefinition<CanvasStore> = {
  id: 'patterns',
  metadata: {
    label: 'Patterns',
  },
  slices: [patternsSliceFactory],
  relatedPluginPanels: [
    {
      id: 'patterns-panel',
      targetPlugin: 'library',
      component: PatternsPanel,
      order: 3,
    },
  ],
  importDefs: importPatternDefs,
  svgDefsEditors: [patternDefsEditor],
};
