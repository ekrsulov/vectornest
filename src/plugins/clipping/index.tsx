import React from 'react';
import { Scissors } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory, SvgDefsEditor } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createClippingSlice, type ClipDefinition, type ClippingPluginSlice } from './slice';
import { ClippingPanel } from './ClippingPanel';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { definitionTranslationRegistry } from '../../utils/definitionTranslationRegistry';
import type { CanvasElement, PathData, GroupElement } from '../../types';
import { commandsToString } from '../../utils/pathParserUtils';
import { parsePathD } from '../../utils/pathParserUtils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { measurePath, measureNativeTextBounds } from '../../utils/measurementUtils';
import { shapeToPath } from '../../utils/import/shapeToPath';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { generateShortId } from '../../utils/idGenerator';
import './persistence';
import './importContribution';

/**
 * Inject a transform attribute directly into each top-level element in SVG content.
 * This is Safari-compatible because Safari doesn't handle transforms on <g> inside clipPath well.
 * Instead of wrapping in <g transform="...">, we add the transform to each element directly.
 */
const injectTransformToElements = (rawContent: string, transformValue: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${rawContent}</svg>`, 'image/svg+xml');
  const svg = doc.documentElement;
  
  // Add transform to each top-level element
  Array.from(svg.children).forEach((child) => {
    const existingTransform = child.getAttribute('transform') || '';
    // Prepend new transform to existing (so existing transforms are applied after scaling/translating)
    const newTransform = existingTransform 
      ? `${transformValue} ${existingTransform}` 
      : transformValue;
    child.setAttribute('transform', newTransform);
  });
  
  return svg.innerHTML;
};

/**
 * Parse SVG content string and convert to React elements.
 * This is needed because dangerouslySetInnerHTML doesn't work reliably inside clipPath.
 */
const parseRawContentToReactElements = (rawContent: string, keyPrefix: string): React.ReactNode[] => {
  const parser = new DOMParser();
  // Wrap in SVG to parse correctly
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${rawContent}</svg>`, 'image/svg+xml');
  const svg = doc.documentElement;
  const elements: React.ReactNode[] = [];
  
  // Allowed shape elements for clipPath
  const shapeElements = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'g', 'use'];
  // SMIL animation elements that should be preserved inside shapes
  const animationElements = ['animate', 'animatetransform', 'animatemotion', 'set'];
  const allAllowedElements = [...shapeElements, ...animationElements];

  const convertElement = (node: Element, index: number): React.ReactNode => {
    const tagName = node.tagName.toLowerCase();
    // Skip elements that aren't shapes or animations
    if (!allAllowedElements.includes(tagName)) {
      return null;
    }
    
    // Convert attributes to React props
    const props: Record<string, string | number> = { key: `${keyPrefix}-${index}` };
    Array.from(node.attributes).forEach((attr) => {
      // Skip xmlns attributes
      if (attr.name.startsWith('xmlns')) return;
      // Convert kebab-case to camelCase for React
      const propName = attr.name === 'class' 
        ? 'className'
        : attr.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      props[propName] = attr.value;
    });
    
    // Animation elements don't have children, just return them
    if (animationElements.includes(tagName)) {
      return React.createElement(tagName, props);
    }
    
    // Handle children for all shape elements (they can have animation children)
    const children: React.ReactNode[] = [];
    Array.from(node.childNodes).forEach((child, childIndex) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = convertElement(child as Element, childIndex);
        if (childElement) children.push(childElement);
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        children.push(child.textContent);
      }
    });
    
    return children.length > 0 
      ? React.createElement(tagName, props, ...children)
      : React.createElement(tagName, props);
  };
  
  Array.from(svg.children).forEach((child, index) => {
    const element = convertElement(child, index);
    if (element) elements.push(element);
  });
  
  return elements;
};

const clipDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'clipping-editor',
  appliesTo: (node) => {
    if (!node.isDefs) return false;
    if (node.tagName === 'clippath') return true;
    return Boolean(node.defsOwnerId);
  },
  update: () => false,
  removeChild: ({ store, node }) => {
    const clipState = store as unknown as ClippingPluginSlice;
    const clipId = (node.defsOwnerId ?? node.idAttribute) ?? '';
    const clip = (clipState.clips ?? []).find((c) => c.id === clipId);
    const removeClip = clipState.removeClip;
    const updateClip = clipState.updateClip;
    if (!clip) return false;

    const tag = node.tagName.toLowerCase();
    // Delete the clip definition itself
    if (tag === 'clippath') {
      removeClip?.(clip.id);
      return true;
    }

     // If we don't have a concrete child index (likely an animation node), remove the whole clip
    if (node.childIndex === undefined) {
      removeClip?.(clip.id);
      return true;
    }

    if (clip.rawContent) {
      if (typeof DOMParser === 'undefined') return false;
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<clipPath>${clip.rawContent}</clipPath>`, 'image/svg+xml');
      const clipEl = doc.querySelector('clipPath');
      if (!clipEl) return false;
      const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
      const children = Array.from(clipEl.children).filter((el) => !ANIMATION_TAGS.has(el.tagName.toLowerCase()));
      if (node.childIndex === undefined || node.childIndex < 0 || node.childIndex >= children.length) return false;
      const target = children[node.childIndex];
      target.parentElement?.removeChild(target);
      const nextContent = clipEl.innerHTML;
      updateClip?.(clip.id, { rawContent: nextContent });
      return true;
    }

    if (clip.baseElementTag) {
      // Without raw content, removing the only child effectively deletes the clip
      removeClip?.(clip.id);
      return true;
    }

    return false;
  },
  revisionSelector: (state) => (state as unknown as ClippingPluginSlice).clips,
};

const clippingSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createClippingSlice(set, get, api),
});

const collectClipUsage = (elements: CanvasElement[]): Set<string> => {
  const usage = new Set<string>();
  elements.forEach((element) => {
    const data = element.data as Record<string, unknown>;
    const clipPathId = data.clipPathId as string | undefined;
    if (clipPathId) {
      usage.add(clipPathId);
    }
  });
  return usage;
};

const serializeClipAnimation = (anim: SVGAnimation, chainDelays: Map<string, number>): string => {
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
        `attributeName="${anim.attributeName ?? 'transform'}"`,
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
    case 'animateMotion': {
      const attrs = [
        commonAttrs,
        anim.path ? `path="${anim.path}"` : null,
        `rotate="${anim.rotate ?? 'auto'}"`,
        anim.keyPoints ? `keyPoints="${anim.keyPoints}"` : null,
      ].filter(Boolean).join(' ');
      if (anim.mpath) {
        return `<animateMotion ${attrs}>\n  <mpath href="#${anim.mpath}" />\n</animateMotion>`;
      }
      return `<animateMotion ${attrs} />`;
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

const renderClipAnimationElements = (
  clipAnimations: SVGAnimation[],
  chainDelays: Map<string, number>,
  restartKey: number = 0,
  allowRender: boolean = true
) => {
  if (!allowRender) return null;
  const unique: SVGAnimation[] = [];
  const seen = new Set<string>();
  clipAnimations.forEach((anim) => {
    const signature = [
      anim.type,
      anim.attributeName ?? '',
      anim.clipPathTargetId ?? '',
      anim.begin ?? '',
      anim.dur ?? '',
      anim.values ?? '',
      anim.from ?? '',
      anim.to ?? '',
      anim.mpath ?? '',
      anim.path ?? '',
    ].join('|');
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(anim);
    }
  });

  return unique.map((anim) => {
    const delayMs = chainDelays.get(anim.id) ?? 0;
    // For clipPath animations with indefinite repeat, use a very small begin value
    // combined with the restartKey to force restart when the key changes
    const beginValue = !allowRender
      ? 'indefinite'
      : delayMs > 0
        ? `${(delayMs / 1000).toFixed(3)}s`
        : '0.001s'; // Use a tiny delay instead of 0s to ensure animation triggers

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

    // If targetElementId differs from clipPathTargetId, we need to add href to point to the internal element
    // This is the normalized approach for animations inside def containers (clipPath, mask, etc.)
    const hrefProp = anim.targetElementId && anim.targetElementId !== anim.clipPathTargetId
      ? { href: `#${anim.targetElementId}` }
      : {};

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
            {...hrefProp}
          />
        );
      case 'animateTransform':
        return (
          <animateTransform
            key={`${anim.id}-${restartKey}`}
            attributeName={anim.attributeName ?? 'transform'}
            type={anim.transformType ?? 'translate'}
            values={anim.values}
            from={anim.from as string | number | undefined}
            to={anim.to as string | number | undefined}
            additive={anim.additive ?? 'replace'}
            accumulate={anim.accumulate ?? 'none'}
            {...commonProps}
            {...hrefProp}
          />
        );
      case 'animateMotion':
        return (
          <animateMotion
            key={`${anim.id}-${restartKey}`}
            path={!anim.mpath ? anim.path : undefined}
            rotate={anim.rotate ?? 'auto'}
            keyPoints={anim.keyPoints}
            {...commonProps}
            {...hrefProp}
          >
            {anim.mpath ? <mpath href={`#${anim.mpath}`} /> : null}
          </animateMotion>
        );
      case 'set':
        return (
          <set
            key={`${anim.id}-${restartKey}`}
            attributeName={anim.attributeName}
            to={anim.to as string | number | undefined}
            {...commonProps}
            {...hrefProp}
          />
        );
      default:
        return null;
    }
  });
};

/**
 * Calculate the local bounds of a group - the bounds of its children in the group's local coordinate space.
 * This is different from getGroupBounds which calculates bounds after the group's transform is applied.
 * The clipPath needs local bounds so it stays in sync with the group's content when the group moves.
 */
const getGroupLocalBounds = (
  group: GroupElement,
  elementMap: Map<string, CanvasElement>,
  visited: Set<string> = new Set()
): { minX: number; minY: number; width: number; height: number } | null => {
  if (visited.has(group.id)) {
    return null;
  }
  visited.add(group.id);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasBounds = false;

  const childIds = group.data.childIds || [];
  
  for (const childId of childIds) {
    const child = elementMap.get(childId);
    if (!child) continue;

    let childBounds: { minX: number; minY: number; width: number; height: number } | null = null;

    if (child.type === 'group') {
      // Recursively get local bounds of nested groups
      childBounds = getGroupLocalBounds(child as GroupElement, elementMap, visited);
    } else {
      // Use getUntransformedBounds for non-group children
      childBounds = getUntransformedBounds(child);
    }

    if (childBounds) {
      minX = Math.min(minX, childBounds.minX);
      minY = Math.min(minY, childBounds.minY);
      maxX = Math.max(maxX, childBounds.minX + childBounds.width);
      maxY = Math.max(maxY, childBounds.minY + childBounds.height);
      hasBounds = true;
    }
  }

  visited.delete(group.id);

  if (!hasBounds) {
    return null;
  }

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const getUntransformedBounds = (element: CanvasElement): { minX: number; minY: number; width: number; height: number } | null => {
  const data = element.data as Record<string, unknown>;

  // For image, nativeShape, and symbolInstance elements that have x, y, width, height
  if ('x' in data && 'y' in data && 'width' in data && 'height' in data) {
    return {
      minX: data.x as number,
      minY: data.y as number,
      width: data.width as number,
      height: data.height as number,
    };
  }

  // For group elements, return null to use fallback bounds calculation
  // Groups don't have explicit bounds - they're calculated from children
  if (element.type === 'group') {
    // Return null to trigger fallback which will calculate bounds from children
    return null;
  }

  // For nativeText, we need to estimate bounds (texto doesn't have explicit width/height)
  // We'll use the getBounds as fallback for these cases
  if (element.type === 'nativeText') {
    // Use measureNativeTextBounds to get the untransformed bounds
    const measured = measureNativeTextBounds(data as Parameters<typeof measureNativeTextBounds>[0]);
    return {
      minX: measured.minX,
      minY: measured.minY,
      width: measured.maxX - measured.minX,
      height: measured.maxY - measured.minY,
    };
  }

  // For path elements, calculate from path data
  if (element.type === 'path') {
    const pathData = data as { subPaths?: Array<Array<unknown>>; strokeWidth?: number };
    if (pathData.subPaths) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bounds = measurePath(pathData.subPaths as any, pathData.strokeWidth ?? 1, 1);
      return {
        minX: bounds.minX,
        minY: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      };
    }
  }

  return null;
};

const normalizeSvgProps = (attrs: Record<string, string>): Record<string, string> => {
  const mapped: Record<string, string> = {};
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'xlink:href') {
      mapped.xlinkHref = value;
      return;
    }
    const camel = key === 'class'
      ? 'className'
      : key.replace(/-([a-z])/g, (_match, c: string) => c.toUpperCase());
    mapped[camel] = value;
  });
  return mapped;
};

const renderClipNode = (
  clip: ClipDefinition,
  instanceId: string,
  elementBounds: { minX: number; minY: number; width: number; height: number },
  clipAnimations: SVGAnimation[] = [],
  chainDelays: Map<string, number> = new Map(),
  restartKey: number = 0,
  allowRender: boolean = true
) => {
  const dedupedAnimations = renderClipAnimationElements(clipAnimations, chainDelays, restartKey, allowRender) ?? [];
  if (clip.shouldScaleToElement === false) {
    if (clip.baseElementTag && clip.baseElementAttrs) {
      const ElementTag = clip.baseElementTag;
      const baseContent = clip.baseElementContent && clip.baseElementContent.trim().length > 0
        ? (ElementTag === 'text'
          ? clip.baseElementContent
          : parseRawContentToReactElements(clip.baseElementContent, `${instanceId}-content`))
        : null;
      const baseContentArray = Array.isArray(baseContent) ? baseContent : (baseContent ? [baseContent] : []);
      const children = [...baseContentArray, ...dedupedAnimations.filter(Boolean)].filter(Boolean);
      // Apply origin offset via transform for userSpaceOnUse clips (coordinates are absolute)
      const needsTranslate = clip.clipPathUnits === 'userSpaceOnUse' && (clip.originX !== 0 || clip.originY !== 0);
      const normalizedAttrs = normalizeSvgProps(clip.baseElementAttrs);
      if (needsTranslate) {
        // Add transform to the element attributes
        const existingTransform = normalizedAttrs.transform || '';
        normalizedAttrs.transform = `translate(${clip.originX}, ${clip.originY}) ${existingTransform}`.trim();
      }
      return (
        <clipPath
          key={`${instanceId}-${restartKey}`}
          id={instanceId}
          clipPathUnits={clip.clipPathUnits ?? 'userSpaceOnUse'}
        >
          {React.createElement(ElementTag, normalizedAttrs, ...children)}
        </clipPath>
      );
    }
    if (clip.rawContent) {
      // For userSpaceOnUse with rawContent, coordinates are already absolute in user space.
      // No transform needed - the clip content should be used as-is.
      // Parse rawContent to React elements instead of using dangerouslySetInnerHTML
      // which doesn't work reliably inside clipPath.
      const parsedElements = parseRawContentToReactElements(clip.rawContent, instanceId);
      return (
        <clipPath
          key={`${instanceId}-${restartKey}`}
          id={instanceId}
          clipPathUnits={clip.clipPathUnits ?? 'userSpaceOnUse'}
        >
          {parsedElements}
          {dedupedAnimations}
        </clipPath>
      );
    }

    const translatedPath = commandsToString(
      clip.pathData.subPaths.flat().map((cmd) => {
        if (cmd.type === 'M' || cmd.type === 'L') {
          return {
            ...cmd,
            position: {
              x: cmd.position.x + clip.originX,
              y: cmd.position.y + clip.originY,
            },
          } as typeof cmd;
        }
        if (cmd.type === 'C') {
          return {
            ...cmd,
            controlPoint1: {
              ...cmd.controlPoint1,
              x: cmd.controlPoint1.x + clip.originX,
              y: cmd.controlPoint1.y + clip.originY,
            },
            controlPoint2: {
              ...cmd.controlPoint2,
              x: cmd.controlPoint2.x + clip.originX,
              y: cmd.controlPoint2.y + clip.originY,
            },
            position: {
              x: cmd.position.x + clip.originX,
              y: cmd.position.y + clip.originY,
            },
          } as typeof cmd;
        }
        return cmd;
      })
    );

    return (
      <clipPath
        key={`${instanceId}-${restartKey}`}
        id={instanceId}
        clipPathUnits={clip.clipPathUnits ?? 'userSpaceOnUse'}
      >
        <path d={translatedPath} />
      </clipPath>
    );
  }

  // Handle rawContent clips that need scaling - apply transform directly to elements (Safari-compatible)
  // Safari/WebKit doesn't correctly handle transforms on <g> inside clipPath
  if (clip.rawContent) {
    const scaleX = elementBounds.width / clip.bounds.width;
    const scaleY = elementBounds.height / clip.bounds.height;
    const translateX = elementBounds.minX - clip.bounds.minX * scaleX;
    const translateY = elementBounds.minY - clip.bounds.minY * scaleY;
    const transformValue = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
    
    // Inject transform attribute directly into each element (not wrapping in <g>)
    const transformedContent = injectTransformToElements(clip.rawContent, transformValue);
    
    // For clips with rawContent, render animations separately and combine with content
    const animationNodes = dedupedAnimations.filter(Boolean);
    
    // Parse the transformed content to React elements
    const parsedElements = parseRawContentToReactElements(transformedContent, instanceId);
    
    return (
      <clipPath
        key={`${instanceId}-${restartKey}`}
        id={instanceId}
        clipPathUnits="userSpaceOnUse"
      >
        {parsedElements}
        {animationNodes}
      </clipPath>
    );
  }

  const scaleX = elementBounds.width / clip.bounds.width;
  const scaleY = elementBounds.height / clip.bounds.height;
  const transformedPath = commandsToString(
    clip.pathData.subPaths.flat().map((cmd) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return {
          type: cmd.type,
          position: {
            x: cmd.position.x * scaleX + elementBounds.minX,
            y: cmd.position.y * scaleY + elementBounds.minY,
          },
        } as typeof cmd;
      }
      if (cmd.type === 'C') {
        return {
          type: 'C',
          controlPoint1: {
            x: cmd.controlPoint1.x * scaleX + elementBounds.minX,
            y: cmd.controlPoint1.y * scaleY + elementBounds.minY,
          },
          controlPoint2: {
            x: cmd.controlPoint2.x * scaleX + elementBounds.minX,
            y: cmd.controlPoint2.y * scaleY + elementBounds.minY,
          },
          position: {
            x: cmd.position.x * scaleX + elementBounds.minX,
            y: cmd.position.y * scaleY + elementBounds.minY,
          },
        } as typeof cmd;
      }
      return cmd;
    })
  );
  return (
    <clipPath
      key={`${instanceId}-${restartKey}`}
      id={instanceId}
      clipPathUnits="userSpaceOnUse"
    >
      <path d={transformedPath} />
    </clipPath>
  );
};

const serializeClipNode = (
  clip: ClipDefinition,
  instanceId: string,
  elementBounds: { minX: number; minY: number; width: number; height: number },
  clipAnimations: SVGAnimation[] = [],
  chainDelays: Map<string, number> = new Map()
) => {
  const unique: SVGAnimation[] = [];
  const seen = new Set<string>();
  clipAnimations.forEach((anim) => {
    const key = anim.id ?? `${anim.type}-${anim.attributeName ?? ''}-${anim.clipPathTargetId ?? ''}-${anim.begin ?? ''}-${anim.dur ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(anim);
    }
  });

    if (clip.shouldScaleToElement === false) {
      const animMarkup = unique.length
        ? unique.map((anim) => serializeClipAnimation(anim, chainDelays)).join('\n')
        : null;
      if (clip.baseElementTag && clip.baseElementAttrs) {
        const attrString = Object.entries(clip.baseElementAttrs).map(([k, v]) => `${k}="${v}"`).join(' ');
        const content = clip.baseElementContent ?? '';
        const inner = [content, animMarkup].filter(Boolean).join('');
        return `<clipPath id="${instanceId}" clipPathUnits="${clip.clipPathUnits ?? 'userSpaceOnUse'}"><${clip.baseElementTag}${attrString ? ` ${attrString}` : ''}>${inner}</${clip.baseElementTag}></clipPath>`;
      }
      if (clip.rawContent) {
        // For userSpaceOnUse with rawContent, coordinates are already absolute.
        // No transform needed - use content as-is.
        const inner = [clip.rawContent, animMarkup].filter(Boolean).join('');
        return `<clipPath id="${instanceId}" clipPathUnits="${clip.clipPathUnits ?? 'userSpaceOnUse'}">${inner}</clipPath>`;
      }
    const translatedPath = commandsToString(
      clip.pathData.subPaths.flat().map((cmd) => {
        if (cmd.type === 'M' || cmd.type === 'L') {
          return {
            ...cmd,
            position: {
              x: cmd.position.x + clip.originX,
              y: cmd.position.y + clip.originY,
            },
          } as typeof cmd;
        }
        if (cmd.type === 'C') {
          return {
            ...cmd,
            controlPoint1: {
              ...cmd.controlPoint1,
              x: cmd.controlPoint1.x + clip.originX,
              y: cmd.controlPoint1.y + clip.originY,
            },
            controlPoint2: {
              ...cmd.controlPoint2,
              x: cmd.controlPoint2.x + clip.originX,
              y: cmd.controlPoint2.y + clip.originY,
            },
            position: {
              x: cmd.position.x + clip.originX,
              y: cmd.position.y + clip.originY,
            },
          } as typeof cmd;
        }
        return cmd;
      })
    );
    // Include animations for translated clipPaths
    if (unique.length > 0) {
      const animMarkup = unique.map((anim) => serializeClipAnimation(anim, chainDelays)).join('\n');
      return `<clipPath id="${instanceId}" clipPathUnits="${clip.clipPathUnits ?? 'userSpaceOnUse'}"><path d="${translatedPath}">${animMarkup}</path></clipPath>`;
    }
    return `<clipPath id="${instanceId}" clipPathUnits="${clip.clipPathUnits ?? 'userSpaceOnUse'}"><path d="${translatedPath}" /></clipPath>`;
  }

  // Handle rawContent clips that need scaling - apply transform directly to elements (Safari-compatible)
  // Safari/WebKit doesn't correctly handle transforms on <g> inside clipPath
  if (clip.rawContent) {
    const scaleX = elementBounds.width / clip.bounds.width;
    const scaleY = elementBounds.height / clip.bounds.height;
    const translateX = elementBounds.minX - clip.bounds.minX * scaleX;
    const translateY = elementBounds.minY - clip.bounds.minY * scaleY;
    const transformValue = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
    
    // Inject transform directly into each element instead of wrapping in <g>
    const transformedContent = injectTransformToElements(clip.rawContent, transformValue);
    
    const animMarkup = unique.length
      ? unique.map((anim) => serializeClipAnimation(anim, chainDelays)).join('\n')
      : '';
    const innerContent = transformedContent + animMarkup;
    return `<clipPath id="${instanceId}" clipPathUnits="userSpaceOnUse">${innerContent}</clipPath>`;
  }

  const scaleX = elementBounds.width / clip.bounds.width;
  const scaleY = elementBounds.height / clip.bounds.height;
  const transformedPath = commandsToString(
    clip.pathData.subPaths.flat().map((cmd) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return {
          type: cmd.type,
          position: {
            x: cmd.position.x * scaleX + elementBounds.minX,
            y: cmd.position.y * scaleY + elementBounds.minY,
          },
        } as typeof cmd;
      }
      if (cmd.type === 'C') {
        return {
          type: 'C',
          controlPoint1: {
            x: cmd.controlPoint1.x * scaleX + elementBounds.minX,
            y: cmd.controlPoint1.y * scaleY + elementBounds.minY,
          },
          controlPoint2: {
            x: cmd.controlPoint2.x * scaleX + elementBounds.minX,
            y: cmd.controlPoint2.y * scaleY + elementBounds.minY,
          },
          position: {
            x: cmd.position.x * scaleX + elementBounds.minX,
            y: cmd.position.y * scaleY + elementBounds.minY,
          },
        } as typeof cmd;
      }
      return cmd;
    })
  );
  
  // Include animations for scaled clipPaths too
  if (unique.length > 0) {
    const animMarkup = unique.map((anim) => serializeClipAnimation(anim, chainDelays)).join('\n');
    return `<clipPath id="${instanceId}" clipPathUnits="userSpaceOnUse"><path d="${transformedPath}">${animMarkup}</path></clipPath>`;
  }
  return `<clipPath id="${instanceId}" clipPathUnits="userSpaceOnUse"><path d="${transformedPath}" /></clipPath>`;
};

const createClipInstances = (
  state: CanvasStore & ClippingPluginSlice,
  usedIds: Set<string>,
  elements: CanvasElement[]
): Array<{ clip: ClipDefinition; instanceId: string; elementBounds: { minX: number; minY: number; width: number; height: number } }> => {
  const clips = state.clips ?? [];
  const viewport = state.viewport ?? { zoom: 1, panX: 0, panY: 0 };
  const elementMap = new Map<string, CanvasElement>();
  elements.forEach((element) => elementMap.set(element.id, element));
  return elements
    .map((element) => {
      const data = element.data as Record<string, unknown>;
      const clipPathId = data.clipPathId as string | undefined;
      const clipPathTemplateId = data.clipPathTemplateId as string | undefined;
      if (!clipPathId) {
        return null;
      }
      if (!usedIds.has(clipPathId)) {
        return null;
      }

      // Try to find clip by template ID first, then by direct ID match
      const clip = clipPathTemplateId
        ? clips.find((clipDef) => clipDef.id === clipPathTemplateId)
        : clips.find((clipDef) => clipDef.id === clipPathId);

      if (!clip) {
        return null;
      }

      // Try to get untransformed bounds first
      let elementBounds = getUntransformedBounds(element);

      // For groups, use getGroupLocalBounds which calculates bounds in the group's local coordinate space
      // This ensures the clipPath stays in sync with the group content when the group is transformed
      if (!elementBounds && element.type === 'group') {
        elementBounds = getGroupLocalBounds(element as GroupElement, elementMap);
      }

      // Fallback to transformed bounds for elements where we can't get untransformed bounds
      if (!elementBounds) {
        const transformedBounds = elementContributionRegistry.getBounds(element, { viewport, elementMap });
        if (!transformedBounds) {
          // Final fallback: use clip's own bounds to at least render the definition
          return clip ? {
            clip,
            instanceId: clipPathId,
            elementBounds: {
              minX: clip.originX ?? 0,
              minY: clip.originY ?? 0,
              width: clip.bounds.width,
              height: clip.bounds.height,
            },
          } : null;
        }
        elementBounds = {
          minX: transformedBounds.minX,
          minY: transformedBounds.minY,
          width: transformedBounds.maxX - transformedBounds.minX,
          height: transformedBounds.maxY - transformedBounds.minY,
        };
      }

      return {
        clip,
        instanceId: clipPathId,
        elementBounds,
      };
    })
    .filter(Boolean) as Array<{ clip: ClipDefinition; instanceId: string; elementBounds: { minX: number; minY: number; width: number; height: number } }>;
};

defsContributionRegistry.register({
  id: 'clips',
  collectUsedIds: collectClipUsage,
  renderDefs: (state, usedIds) => {
    const clipState = state as CanvasStore & ClippingPluginSlice & AnimationPluginSlice;
    const instances = createClipInstances(clipState, usedIds, state.elements ?? []);
    if (!instances.length) return null;
    const animations = clipState.animations ?? [];
    const chainDelays = clipState.calculateChainDelays ? clipState.calculateChainDelays() : new Map<string, number>();
    
    // Check if there are any clipPath animations
    const hasClipPathAnimations = animations.some((anim) => anim.clipPathTargetId !== undefined);
    
    // Allow render when playing, has played, workspace is open, OR when there are clipPath-specific animations
    // This ensures clipPath animations (like typewriter effect) are always rendered
    const allowRender = (clipState.animationState?.isPlaying ?? false) || 
                        (clipState.animationState?.hasPlayed ?? false) ||
                        (clipState.animationState?.isWorkspaceOpen ?? false) ||
                        hasClipPathAnimations;
    return (
      <>
        {Array.from(new Map(instances.map(inst => [inst.instanceId, inst])).values()).map(({ clip, instanceId, elementBounds }) => {
          const clipAnimations = animations.filter((anim) => anim.clipPathTargetId === clip.id);
          return renderClipNode(
            clip,
            instanceId,
            elementBounds,
            clipAnimations,
            chainDelays,
            (clipState.animationState?.restartKey ?? 0),
            allowRender
          );
        })}
      </>
    );
  },
  serializeDefs: (state, usedIds) => {
    const clipState = state as CanvasStore & ClippingPluginSlice & AnimationPluginSlice;
    const instances = createClipInstances(clipState, usedIds, state.elements ?? []);
    if (!instances.length) return [];
    const animations = clipState.animations ?? [];
    const chainDelays = clipState.calculateChainDelays ? clipState.calculateChainDelays() : new Map<string, number>();
    return Array.from(new Map(instances.map(inst => [inst.instanceId, inst])).values()).map(({ clip, instanceId, elementBounds }) => {
      const clipAnimations = animations.filter((anim) => anim.clipPathTargetId === clip.id);
      return serializeClipNode(clip, instanceId, elementBounds, clipAnimations, chainDelays);
    });
  },
});

// Register definition translation contribution to update clip origins when elements move
definitionTranslationRegistry.register({
  id: 'clipping',
  translateDefinitions: (context, state, setState) => {
    const clipState = state as CanvasStore & ClippingPluginSlice;
    const clips = clipState.clips ?? [];
    if (clips.length === 0) return;

    // Collect all clip IDs used by moved elements
    const allMovedIds = new Set([...context.movedElementIds, ...context.movedGroupIds]);
    const usedClipTemplateIds = new Set<string>();
    
    // Also need to check descendants of moved groups
    const movedDescendantIds = new Set<string>();
    context.movedGroupIds.forEach((groupId) => {
      const descendants = clipState.getGroupDescendants?.(groupId) ?? [];
      descendants.forEach((id) => movedDescendantIds.add(id));
    });

    const elementsToCheck = new Set([...allMovedIds, ...movedDescendantIds]);

    (state.elements ?? []).forEach((el) => {
      if (!elementsToCheck.has(el.id)) return;
      const data = el.data as PathData;
      // Use the template ID, not the instance ID
      if (data?.clipPathTemplateId) {
        usedClipTemplateIds.add(data.clipPathTemplateId);
      } else if (data?.clipPathId) {
        // For imported clips, the clipPathId might be the direct reference
        usedClipTemplateIds.add(data.clipPathId);
      }
    });

    if (usedClipTemplateIds.size === 0) return;

    // Update clip definitions that use userSpaceOnUse
    const updatedClips = clips.map((clip) => {
      if (!usedClipTemplateIds.has(clip.id)) return clip;
      // Only translate clips with userSpaceOnUse (absolute coordinates)
      if (clip.clipPathUnits !== 'userSpaceOnUse') return clip;
      
      return {
        ...clip,
        originX: clip.originX + context.deltaX,
        originY: clip.originY + context.deltaY,
      };
    });

    // Only update state if something changed
    const hasChanges = updatedClips.some((clip, i) => clip !== clips[i]);
    if (hasChanges) {
      setState(() => ({ clips: updatedClips } as Partial<CanvasStore>));
    }
  },
});

const importClipDefs = (doc: Document): Record<string, ClipDefinition[]> | null => {
  const nodes = Array.from(doc.querySelectorAll('clipPath'));
  if (!nodes.length) return null;

  // Group clipPaths by their template ID (remove element suffix)
  const clipMap = new Map<string, {
    id: string;
    pathD: string;
    clipPathUnits: 'userSpaceOnUse' | 'objectBoundingBox';
    rawContent?: string;
    baseElementTag?: string;
    baseElementAttrs?: Record<string, string>;
    baseElementContent?: string;
  }>();
  const getAnimatedNumericAttribute = (el: Element, attribute: string, fallback: number): number => {
    let maxValue = Number.isFinite(fallback) ? fallback : 0;
    const animations = Array.from(el.querySelectorAll('animate'));
    animations.forEach((anim) => {
      if (anim.getAttribute('attributeName') !== attribute) return;
      const considerValue = (raw: string | null) => {
        if (!raw) return;
        raw.split(';').forEach((token) => {
          const parsed = parseFloat(token);
          if (!Number.isNaN(parsed)) {
            maxValue = Math.max(maxValue, parsed);
          }
        });
      };
      considerValue(anim.getAttribute('from'));
      considerValue(anim.getAttribute('to'));
      considerValue(anim.getAttribute('values'));
    });
    return maxValue;
  };

  nodes.forEach((node) => {
    const fullId = node.getAttribute('id') ?? generateShortId('clp');
    const clipPathUnits = (node.getAttribute('clipPathUnits') as 'userSpaceOnUse' | 'objectBoundingBox' | null) ?? 'userSpaceOnUse';
    
    // Preserve ALL content - animations, multiple elements, colors, etc.
    // Strip animations only for the rawContent since they are imported separately
    const clone = node.cloneNode(true) as Element;
    clone.querySelectorAll('animate, animateTransform, animateMotion, animateColor, set').forEach((el) => el.remove());
    const rawContent = clone.innerHTML;
    
    // Count non-animation child elements
    const nonAnimChildren = Array.from(node.children).filter((child) => {
      const tag = child.tagName.toLowerCase();
      return tag !== 'animate' && tag !== 'animatetransform' && tag !== 'animatemotion' && tag !== 'set';
    });
    const hasMultipleElements = nonAnimChildren.length > 1;
    
    // For animation support, keep base element info ONLY if there's a single element
    // If there are multiple elements, we use rawContent directly
    let baseElementTag: string | undefined;
    let baseElementAttrs: Record<string, string> | undefined;
    let baseElementContent: string | undefined;
    
    if (!hasMultipleElements && nonAnimChildren.length === 1) {
      const firstNonAnimChild = nonAnimChildren[0];
      baseElementTag = firstNonAnimChild.tagName.toLowerCase();
      const cleanClone = firstNonAnimChild.cloneNode(true) as Element;
      cleanClone.querySelectorAll('animate, animateTransform, animateMotion, set').forEach((anim) => anim.remove());
      baseElementAttrs = {};
      Array.from(cleanClone.attributes).forEach((attr) => {
        baseElementAttrs![attr.name] = attr.value;
      });
      const trimmedContent = (cleanClone.innerHTML ?? '').trim();
      baseElementContent = trimmedContent.length > 0 ? trimmedContent : undefined;
    }
    
    // Extract path data ONLY for bounds calculation - the actual clipPath uses rawContent
    let pathD: string | null = null;
    
    // Collect ALL paths and shapes to calculate combined bounds
    const allShapeNodes = Array.from(node.children).filter((child) => {
      const tag = child.tagName.toLowerCase();
      return tag !== 'defs' && tag !== 'clipPath' && tag !== 'animate' && tag !== 'animatetransform' && tag !== 'animatemotion' && tag !== 'set';
    });
    
    const pathParts: string[] = [];
    
    for (const shapeNode of allShapeNodes) {
      const shapeClone = shapeNode.cloneNode(true) as Element;
      const tag = shapeClone.tagName.toLowerCase();
      
      // Handle path elements directly
      if (tag === 'path') {
        let d = shapeClone.getAttribute('d');
        if (!d) {
          const animateD = shapeClone.querySelector('animate[attributeName="d"]');
          if (animateD) {
            const values = animateD.getAttribute('values');
            const from = animateD.getAttribute('from');
            const to = animateD.getAttribute('to');
            d = values?.split(';').map((v) => v.trim()).filter(Boolean)[0] || from || to || null;
          }
        }
        if (d) {
          pathParts.push(d);
        }
        continue;
      }
      
      if (tag === 'use') {
        const href = shapeClone.getAttribute('href') ?? shapeClone.getAttribute('xlink:href');
        const refId = href?.startsWith('#') ? href.slice(1) : null;
        const refNode = refId ? doc.getElementById(refId) : null;
        if (refNode) {
          const refClone = refNode.cloneNode(true) as Element;
          const useTransform = shapeClone.getAttribute('transform');
          if (useTransform) {
            const existingTransform = refClone.getAttribute('transform') ?? '';
            refClone.setAttribute('transform', `${existingTransform} ${useTransform}`.trim());
          }
          ['x', 'y', 'width', 'height'].forEach((attr) => {
            const val = shapeClone.getAttribute(attr);
            if (val) {
              refClone.setAttribute(attr, val);
            }
          });
          const candidate = shapeToPath(refClone);
          if (candidate) {
            pathParts.push(candidate);
          }
        }
        continue;
      }
      
      if (tag === 'rect') {
        const baseWidth = parseFloat(shapeClone.getAttribute('width') ?? '0');
        const baseHeight = parseFloat(shapeClone.getAttribute('height') ?? '0');
        const maxWidth = getAnimatedNumericAttribute(shapeClone, 'width', baseWidth);
        const maxHeight = getAnimatedNumericAttribute(shapeClone, 'height', baseHeight);
        shapeClone.setAttribute('width', `${maxWidth}`);
        shapeClone.setAttribute('height', `${maxHeight}`);
      }
      
      const converted = shapeToPath(shapeClone);
      if (converted) {
        pathParts.push(converted);
      }
    }
    
    // Combine all paths for bounds calculation
    if (pathParts.length > 0) {
      pathD = pathParts.join(' ');
    }
    
    // For text-based clipPaths, estimate bounds from text attributes
    let textBoundsEstimate: { x: number; y: number; width: number; height: number } | null = null;
    if (!pathD && baseElementTag === 'text') {
      const textX = parseFloat(baseElementAttrs?.x ?? '0');
      const textY = parseFloat(baseElementAttrs?.y ?? '0');
      const fontSize = parseFloat(baseElementAttrs?.['font-size'] ?? '16');
      // Estimate text width based on content length and font size
      const textContent = baseElementContent ?? nonAnimChildren[0]?.textContent ?? '';
      const estimatedWidth = textContent.length * fontSize * 0.6; // Rough estimate
      const estimatedHeight = fontSize * 1.2;
      textBoundsEstimate = {
        x: textX,
        y: textY - fontSize, // Text y is baseline, so adjust
        width: Math.max(estimatedWidth, 100),
        height: estimatedHeight,
      };
    }
    
    if (!pathD) {
      // Fallback minimal path to keep the clipPath import when only rawContent exists
      // If we have text bounds, create a path that encompasses the text area
      if (textBoundsEstimate) {
        const { x, y, width, height } = textBoundsEstimate;
        pathD = `M${x} ${y} L${x + width} ${y} L${x + width} ${y + height} L${x} ${y + height} Z`;
      } else {
        pathD = 'M0 0 L1 0 L1 1 L0 1 Z';
      }
    }

    // Extract template ID by removing the element suffix (e.g., "-element_XXXX")
    // Pattern: clip-XXXXX-XXXX-element_XXXXX -> clip-XXXXX-XXXX
    const templateId = fullId.replace(/-element_[^-]+$/, '');

    // Only keep the first occurrence of each template
    if (!clipMap.has(templateId)) {
      clipMap.set(templateId, { id: templateId, pathD, clipPathUnits, rawContent, baseElementTag, baseElementAttrs, baseElementContent });
    }
  });

  const clips: ClipDefinition[] = Array.from(clipMap.values())
    .map(({ id, pathD, clipPathUnits, rawContent, baseElementTag, baseElementAttrs, baseElementContent }) => {
      // Parse path data
      const parsedCommands = parsePathD(pathD);
      const subPaths = [parsedCommands];

      // Calculate bounds from path
      const measured = measurePath(subPaths, 1, 1);
      const boundsWidth = measured.maxX - measured.minX;
      const boundsHeight = measured.maxY - measured.minY;

      // Normalize path to start at 0,0 by translating it
      // For userSpaceOnUse, we must preserve absolute coordinates
      const shouldNormalize = clipPathUnits !== 'userSpaceOnUse';

      const normalizedCommands = !shouldNormalize
        ? parsedCommands
        : parsedCommands.map(cmd => {
          if (cmd.type === 'M' || cmd.type === 'L') {
            return {
              ...cmd,
              position: {
                x: cmd.position.x - measured.minX,
                y: cmd.position.y - measured.minY,
              },
            };
          }
          if (cmd.type === 'C') {
            return {
              ...cmd,
              controlPoint1: {
                ...cmd.controlPoint1,
                x: cmd.controlPoint1.x - measured.minX,
                y: cmd.controlPoint1.y - measured.minY,
              },
              controlPoint2: {
                ...cmd.controlPoint2,
                x: cmd.controlPoint2.x - measured.minX,
                y: cmd.controlPoint2.y - measured.minY,
              },
              position: {
                x: cmd.position.x - measured.minX,
                y: cmd.position.y - measured.minY,
              },
            };
          }
          return cmd;
        });

      const normalizedSubPaths = [normalizedCommands];
      const pathData = {
        subPaths: normalizedSubPaths,
        strokeColor: 'none',
        strokeWidth: 1,
        fillColor: '#000000',
        strokeOpacity: 1,
        fillOpacity: 1,
      };

      return {
        id,
        name: id.replace(/^clip-/, '').replace(/-/g, ' '),
        pathData,
        bounds: {
          minX: shouldNormalize ? 0 : measured.minX,
          minY: shouldNormalize ? 0 : measured.minY,
          width: boundsWidth,
          height: boundsHeight,
        },
        originX: shouldNormalize ? measured.minX : 0,
        originY: shouldNormalize ? measured.minY : 0,
        clipPathUnits,
        // If we have base element info (e.g., rect) or animations, keep userSpace shape without scaling.
        shouldScaleToElement: rawContent ? false : baseElementTag ? false : clipPathUnits === 'objectBoundingBox',
        rawContent,
        baseElementTag,
        baseElementAttrs,
        baseElementContent,
      };
    });

  return clips.length > 0 ? { clip: clips } : null;
};

export const clippingPlugin: PluginDefinition<CanvasStore> = {
  id: 'clipping',
  metadata: {
    label: 'Clipping',
    icon: Scissors,
    cursor: 'default',
  },
  slices: [clippingSliceFactory],
  importDefs: importClipDefs,
  svgDefsEditors: [clipDefsEditor],
  styleAttributeExtractor: (element) => {
    const clipPathAttr = element.getAttribute('clip-path');
    if (clipPathAttr) {
      const match = clipPathAttr.match(/url\(#([^)]+)\)/);
      if (match) {
        const fullClipPathId = match[1];
        const templateId = fullClipPathId.replace(/-element_[^-]+$/, '');
        return {
          clipPathId: fullClipPathId,
          clipPathTemplateId: templateId,
        };
      }
    }
    return {};
  },
  relatedPluginPanels: [
    {
      id: 'clipping-panel',
      targetPlugin: 'library',
      component: ClippingPanel,
      order: 4,
    },
  ],
};
