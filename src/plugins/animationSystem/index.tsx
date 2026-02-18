import type { PluginDefinition, SvgDefsEditor, SvgStructureNodeSnapshot } from '../../types/plugins';
import { Play } from 'lucide-react';
import { canvasStoreApi } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSelectOrIdlePanel } from '../../utils/pluginFactories';
import { AnimationControlsPanel } from './AnimationControlsPanel';
import { AnimationWorkspaceDialog } from './AnimationWorkspaceDialog';
import { createAnimationSlice } from './slice';
import type { AnimationPluginSlice, SVGAnimation, AnimationType } from './types';
import { useAnimationTimer } from './hooks/useAnimationTimer';
import { animationContributionRegistry } from '../../utils/animationContributionRegistry';
import { definitionTranslationRegistry } from '../../utils/definitionTranslationRegistry';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { generateShortId } from '../../utils/idGenerator';
import './importContribution';
import './exportContribution';
import { registerAnimationCleanupHook } from './cleanupHook';
import './rendererExtension';
import './persistence';
import { GizmoProvider } from './gizmos/GizmoContext';
import { AnimationGizmoOverlay } from './integration';

/**
 * Generate a unique animation ID
 */
function generateAnimationId(): string {
  return generateShortId('anm');
}

// Register cleanup hook to keep animation state in sync with element lifecycle
registerAnimationCleanupHook();

// Register definition translation contribution to move referenced paths
// when elements with animateMotion mpath references are moved
definitionTranslationRegistry.register({
  id: 'animation-path-references',
  translateDefinitions: (context, state, setState) => {
    const animState = state as CanvasStore & AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const elements = state.elements ?? [];

    if (animations.length === 0) return;

    // Collect all moved element IDs including descendants
    const allMovedIds = new Set([...context.movedElementIds, ...context.movedGroupIds]);
    const movedDescendantIds = new Set<string>();
    context.movedGroupIds.forEach((groupId) => {
      const descendants = animState.getGroupDescendants?.(groupId) ?? [];
      descendants.forEach((id) => movedDescendantIds.add(id));
    });
    const elementsToCheck = new Set([...allMovedIds, ...movedDescendantIds]);

    // Find paths that need to be moved because they're referenced by mpath from moved elements
    const pathsToMove = new Set<string>();

    // Check animations for mpath references from moved elements
    animations.forEach((anim) => {
      if (!elementsToCheck.has(anim.targetElementId)) return;
      if (anim.type === 'animateMotion' && anim.mpath) {
        // mpath is the ID of the path element that defines the motion trajectory
        const mpathId = anim.mpath;
        // Only add if the path exists and is NOT being moved with the group
        // (if the path is inside the same group, it's already moving)
        const pathEl = elements.find((el) => el.id === mpathId);
        if (pathEl && !elementsToCheck.has(mpathId)) {
          pathsToMove.add(mpathId);
        }
      }
    });

    if (pathsToMove.size === 0) return;

    // Translate the referenced paths
    const updatedElements = elements.map((el) => {
      if (!pathsToMove.has(el.id)) return el;

      const translated = elementContributionRegistry.translateElement(
        el,
        context.deltaX,
        context.deltaY,
        3 // precision
      );

      return translated ?? el;
    });

    // Only update if something changed
    const hasChanges = updatedElements.some((el, i) => el !== elements[i]);
    if (hasChanges) {
      setState(() => ({ elements: updatedElements } as Partial<CanvasStore>));
    }
  },
});

/**
 * Imported animation with source element ID (before ID remapping)
 */
export interface ImportedAnimation {
  sourceElementId: string;
  clipPathId?: string;
  clipPathChildIndex?: number;
  gradientId?: string;
  patternId?: string;
  patternChildIndex?: number;
  filterId?: string;
  maskId?: string;
  maskChildIndex?: number;
  markerId?: string;
  markerChildIndex?: number;
  symbolId?: string;
  symbolChildIndex?: number;
  stopIndex?: number;
  filterPrimitiveIndex?: number;
  animation: Omit<SVGAnimation, 'id' | 'targetElementId' | 'clipPathTargetId' | 'gradientTargetId' | 'patternTargetId' | 'filterTargetId' | 'maskTargetId' | 'markerTargetId' | 'symbolTargetId'>;
}

/**
 * Determine if an element is a def container (clipPath, gradient, pattern, filter, symbol)
 */
function getDefAncestorInfo(animEl: Element): {
  clipPathId?: string;
  clipPathChildIndex?: number;
  gradientId?: string;
  patternId?: string;
  patternChildIndex?: number;
  filterId?: string;
  textId?: string;
  maskId?: string;
  maskChildIndex?: number;
  markerId?: string;
  markerChildIndex?: number;
  symbolId?: string;
  symbolChildIndex?: number;
  stopIndex?: number;
  filterPrimitiveIndex?: number;
} {
  // Check for symbol ancestor first (symbols contain reusable graphics)
  const symbolAncestor = animEl.closest('symbol');
  if (symbolAncestor) {
    const symbolId = symbolAncestor.getAttribute('id') ?? undefined;
    // Find which child element inside the symbol the animation is attached to
    const parentElement = animEl.parentElement;
    let symbolChildIndex: number | undefined;
    if (parentElement && parentElement !== (symbolAncestor as Element)) {
      const children = Array.from(symbolAncestor.children).filter(
        (el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && !['animate', 'animatetransform', 'animatemotion', 'set'].includes(tag);
        }
      );
      symbolChildIndex = children.indexOf(parentElement as Element);
      if (symbolChildIndex === -1) {
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(animEl)) {
            symbolChildIndex = i;
            break;
          }
        }
      }
      if (symbolChildIndex === -1) symbolChildIndex = undefined;
    }
    return { symbolId, symbolChildIndex };
  }
  const markerAncestor = animEl.closest('marker');
  if (markerAncestor) {
    const markerId = markerAncestor.getAttribute('id') ?? undefined;
    // Find which child element inside the marker the animation is attached to
    const parentElement = animEl.parentElement;
    let markerChildIndex: number | undefined;
    if (parentElement && parentElement !== (markerAncestor as Element)) {
      const children = Array.from(markerAncestor.children).filter(
        (el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && !['animate', 'animatetransform', 'animatemotion', 'set'].includes(tag);
        }
      );
      markerChildIndex = children.indexOf(parentElement as Element);
      if (markerChildIndex === -1) {
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(animEl)) {
            markerChildIndex = i;
            break;
          }
        }
      }
      if (markerChildIndex === -1) markerChildIndex = undefined;
    }
    return { markerId, markerChildIndex };
  }
  const textPathAncestor = animEl.closest('textPath');
  if (textPathAncestor) {
    const textAncestor = textPathAncestor.closest('text');
    return { textId: textAncestor?.getAttribute('id') ?? undefined };
  }
  const maskAncestor = animEl.closest('mask');
  if (maskAncestor) {
    const maskId = maskAncestor.getAttribute('id') ?? undefined;
    // Find which child element inside the mask the animation is attached to
    const parentElement = animEl.parentElement;
    let maskChildIndex: number | undefined;
    if (parentElement && parentElement !== (maskAncestor as Element)) {
      // Exclude <defs> and animation tags to match injectAnimationsIntoMaskContent indexing
      const children = Array.from(maskAncestor.children).filter(
        (el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && !['animate', 'animatetransform', 'animatemotion', 'set'].includes(tag);
        }
      );
      maskChildIndex = children.indexOf(parentElement as Element);
      if (maskChildIndex === -1) {
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(animEl)) {
            maskChildIndex = i;
            break;
          }
        }
      }
      if (maskChildIndex === -1) maskChildIndex = undefined;
    }
    return { maskId, maskChildIndex };
  }
  const clipAncestor = animEl.closest('clipPath');
  if (clipAncestor) {
    const clipPathId = clipAncestor.getAttribute('id') ?? undefined;
    // Find which child element inside the clipPath the animation is attached to
    const parentElement = animEl.parentElement;
    let clipPathChildIndex: number | undefined;
    if (parentElement && parentElement !== (clipAncestor as Element)) {
      const children = Array.from(clipAncestor.children).filter(
        (el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && !['animate', 'animatetransform', 'animatemotion', 'set'].includes(tag);
        }
      );
      clipPathChildIndex = children.indexOf(parentElement as Element);
      if (clipPathChildIndex === -1) {
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(animEl)) {
            clipPathChildIndex = i;
            break;
          }
        }
      }
      if (clipPathChildIndex === -1) clipPathChildIndex = undefined;
    }
    return { clipPathId, clipPathChildIndex };
  }

  const gradientAncestor = animEl.closest('linearGradient, radialGradient');
  if (gradientAncestor) {
    const gradientId = gradientAncestor.getAttribute('id') ?? undefined;
    const stopAncestor = animEl.closest('stop');
    let stopIndex: number | undefined;
    if (stopAncestor && gradientId) {
      // Find index of stop
      const stops = Array.from(gradientAncestor.querySelectorAll('stop'));
      stopIndex = stops.indexOf(stopAncestor);
      if (stopIndex === -1) stopIndex = undefined;
    }
    return { gradientId, stopIndex };
  }

  const patternAncestor = animEl.closest('pattern');
  if (patternAncestor) {
    const patternId = patternAncestor.getAttribute('id') ?? undefined;
    // Find which child element inside the pattern the animation is attached to
    const parentElement = animEl.parentElement;
    let patternChildIndex: number | undefined;
    if (parentElement && parentElement !== (patternAncestor as Element)) {
      // Get direct children of pattern that are shape/path elements (exclude defs)
      const children = Array.from(patternAncestor.children).filter(
        (el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && tag !== 'animate' && 
                 tag !== 'animatetransform' && 
                 tag !== 'animatemotion' &&
                 tag !== 'set';
        }
      );
      patternChildIndex = children.indexOf(parentElement as Element);
      if (patternChildIndex === -1) {
        // Parent might be nested - find the top-level child that contains the animation
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(animEl)) {
            patternChildIndex = i;
            break;
          }
        }
      }
      if (patternChildIndex === -1) patternChildIndex = undefined;
    }
    return { patternId, patternChildIndex };
  }

  const filterAncestor = animEl.closest('filter');
  if (filterAncestor) {
    const filterId = filterAncestor.getAttribute('id') ?? undefined;
    // Find which filter primitive the animation is in
    const filterPrimitives = ['feTurbulence', 'feDisplacementMap', 'feGaussianBlur', 'feOffset',
      'feColorMatrix', 'feComponentTransfer', 'feMerge', 'feBlend', 'feFlood', 'feComposite',
      'feMorphology', 'feConvolveMatrix', 'feDiffuseLighting', 'feSpecularLighting', 'feImage',
      'feTile', 'feDropShadow'];
    const primitiveParent = animEl.closest(filterPrimitives.join(', '));
    let filterPrimitiveIndex: number | undefined;
    if (primitiveParent && filterAncestor) {
      const primitives = Array.from(filterAncestor.querySelectorAll(filterPrimitives.join(', ')));
      filterPrimitiveIndex = primitives.indexOf(primitiveParent);
      if (filterPrimitiveIndex === -1) filterPrimitiveIndex = undefined;
    }
    // Also check for animations on feFunc* elements inside feComponentTransfer
    const feFuncParent = animEl.closest('feFuncR, feFuncG, feFuncB, feFuncA');
    if (feFuncParent) {
      // For feFunc* animations, we still track by filter ID
      return { filterId, filterPrimitiveIndex };
    }
    return { filterId, filterPrimitiveIndex };
  }

  return {};
}

/**
 * Parse animation elements from SVG document
 */
function importAnimationDefs(doc: Document): Record<string, unknown[]> | null {
  const animations: ImportedAnimation[] = [];

  // Find all animation elements in the document
  const animationElements = doc.querySelectorAll('animate, animateTransform, animateMotion, set');

  animationElements.forEach((animEl) => {

    const parentElement = animEl.parentElement;
    if (!parentElement) return;

    // Check if animation has explicit target via href/xlink:href
    const animHref = animEl.getAttribute('href') || animEl.getAttribute('xlink:href');
    let hrefTargetId: string | null = null;
    if (animHref && animHref.startsWith('#')) {
      hrefTargetId = animHref.slice(1);
    }

    // Get def container info (clipPath, gradient, pattern, filter, symbol)
    const defInfo = getDefAncestorInfo(animEl);
    const { clipPathId, clipPathChildIndex, gradientId, patternId, patternChildIndex, filterId, maskId, maskChildIndex, markerId, markerChildIndex, symbolId, symbolChildIndex, textId, stopIndex, filterPrimitiveIndex } = defInfo;

    // For animations inside masks, clipPaths, or symbols, we need to track the actual parent element
    // (not the def container itself) so we can inject the animation back into the correct
    // position during serialization. This normalizes both mask and clipPath handling.
    let sourceElementId: string | null = null;

    if (symbolId) {
      // Animation is inside a symbol - get or generate ID for the actual parent element
      sourceElementId = hrefTargetId ?? parentElement.getAttribute('id');
      if (!sourceElementId) {
        // Generate an ID for the parent element inside the symbol
        sourceElementId = generateShortId('ant');
        parentElement.setAttribute('id', sourceElementId);
      }
    } else if (maskId) {
      // Animation is inside a mask - get or generate ID for the actual parent element
      sourceElementId = hrefTargetId ?? parentElement.getAttribute('id');
      if (!sourceElementId) {
        // Generate an ID for the parent element inside the mask
        sourceElementId = generateShortId('ant');
        parentElement.setAttribute('id', sourceElementId);
      }
    } else if (clipPathId) {
      // Animation is inside a clipPath - get or generate ID for the actual parent element
      // This normalizes clipPath handling to match mask handling
      sourceElementId = hrefTargetId ?? parentElement.getAttribute('id');
      if (!sourceElementId) {
        // Generate an ID for the parent element inside the clipPath
        sourceElementId = generateShortId('ant');
        parentElement.setAttribute('id', sourceElementId);
      }
    } else if (textId !== undefined) {
      // Animation is inside a textPath and text has an ID - use it
      // But we also need to check if textPath has an href, because in the store model
      // textPath data is attached to the referenced PATH element, not stored as a separate text element.
      const textPathAncestor = animEl.closest('textPath');
      if (textPathAncestor) {
        const href = textPathAncestor.getAttribute('href') || textPathAncestor.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
          // Use the referenced path's ID - that's where textPath data will be attached
          sourceElementId = href.slice(1);
        } else {
          sourceElementId = textId;

        }
      } else {
        sourceElementId = textId;
      }
    } else {
      // Animation is inside a textPath but text has no ID - check href first
      const textPathAncestor = animEl.closest('textPath');
      if (textPathAncestor) {
        const href = textPathAncestor.getAttribute('href') || textPathAncestor.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
          // Use the referenced path's ID as the target
          sourceElementId = href.slice(1);

        } else {
          // Fallback: generate ID for text element (unlikely case)
          const textAncestor = textPathAncestor.closest('text');
          if (textAncestor) {
            sourceElementId = textAncestor.getAttribute('id');

            if (!sourceElementId) {
                sourceElementId = generateShortId('ant');
              textAncestor.setAttribute('id', sourceElementId);

            }
          }
        }
      }

      if (!sourceElementId) {
        // Get the target element's ID:
        // 1. Explicit href/xlink:href on animation takes priority
        // 2. Def container ID (for animations on defs like gradients, patterns, filters)
        // 3. Parent element ID
        sourceElementId =
          hrefTargetId ??
          gradientId ?? patternId ?? filterId ?? markerId ??
          parentElement.getAttribute('id');
      }
    }

    if (!sourceElementId) {
      const isMasking = parentElement.tagName.toLowerCase() === 'mask';
      // Assign a synthetic ID so animations without explicit targets can be mapped
      sourceElementId = generateShortId('ant');
      parentElement.setAttribute('id', sourceElementId);
      if (isMasking) {
        parentElement.setAttribute('data-import-generated', 'true');
      }
    }

    const tagName = animEl.tagName.toLowerCase();

    // Parse common attributes
    const dur = animEl.getAttribute('dur') ?? '2s';
    const begin = animEl.getAttribute('begin') ?? '0s';
    const end = animEl.getAttribute('end') ?? undefined;
    const fill = (animEl.getAttribute('fill') as 'freeze' | 'remove') ?? 'freeze';
    const repeatCountAttr = animEl.getAttribute('repeatCount');
    const repeatCount: number | 'indefinite' | undefined = repeatCountAttr === 'indefinite'
      ? 'indefinite' as const
      : repeatCountAttr ? parseFloat(repeatCountAttr) : 1;
    const repeatDur = animEl.getAttribute('repeatDur') ?? undefined;
    const calcMode = (animEl.getAttribute('calcMode') as 'linear' | 'discrete' | 'paced' | 'spline') ?? 'linear';
    const keyTimes = animEl.getAttribute('keyTimes') ?? undefined;
    const keySplines = animEl.getAttribute('keySplines') ?? undefined;

    const baseAnimation = {
      type: tagName === 'animatetransform'
        ? 'animateTransform'
        : tagName === 'animatemotion'
          ? 'animateMotion'
          : tagName as AnimationType,
      dur,
      begin,
      end,
      fill,
      repeatCount,
      repeatDur,
      calcMode,
      keyTimes,
      keySplines,
    };

    switch (tagName) {
      case 'animate': {
        const attributeName = animEl.getAttribute('attributeName') ?? undefined;
        const from = animEl.getAttribute('from') ?? undefined;
        const to = animEl.getAttribute('to') ?? undefined;
        const values = animEl.getAttribute('values') ?? undefined;
        const additive = (animEl.getAttribute('additive') as 'replace' | 'sum') ?? 'replace';
        const accumulate = (animEl.getAttribute('accumulate') as 'none' | 'sum') ?? 'none';

        animations.push({
          sourceElementId,
          animation: {
            ...baseAnimation,
            attributeName,
            from,
            to,
            values,
            additive,
            accumulate,
          },
          clipPathId,
          clipPathChildIndex,
          gradientId,
          patternId,
          patternChildIndex,
          filterId,
          stopIndex,
          filterPrimitiveIndex,
          maskId,
          maskChildIndex,
          markerId,
          markerChildIndex,
          symbolId,
          symbolChildIndex,
        });
        break;
      }
      case 'animatetransform': {
        const attributeName = animEl.getAttribute('attributeName') ?? 'transform';
        const transformType = (animEl.getAttribute('type') as 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY') ?? 'translate';
        const from = animEl.getAttribute('from') ?? undefined;
        const to = animEl.getAttribute('to') ?? undefined;
        const values = animEl.getAttribute('values') ?? undefined;
        const additive = (animEl.getAttribute('additive') as 'replace' | 'sum') ?? 'replace';
        const accumulate = (animEl.getAttribute('accumulate') as 'none' | 'sum') ?? 'none';

        animations.push({
          sourceElementId,
          animation: {
            ...baseAnimation,
            attributeName,
            transformType,
            from,
            to,
            values,
            additive,
            accumulate,
          },
          clipPathId,
          clipPathChildIndex,
          gradientId,
          patternId,
          patternChildIndex,
          filterId,
          stopIndex,
          filterPrimitiveIndex,
          maskId,
          maskChildIndex,
          markerId,
          markerChildIndex,
          symbolId,
          symbolChildIndex,
        });
        break;
      }
      case 'animatemotion': {
        const path = animEl.getAttribute('path') ?? undefined;
        const rotate = animEl.getAttribute('rotate') ?? 'auto';
        const keyPoints = animEl.getAttribute('keyPoints') ?? undefined;
        const mpathEl = animEl.querySelector('mpath');
        const mpath = mpathEl ? (mpathEl.getAttribute('href') ?? mpathEl.getAttribute('xlink:href'))?.replace('#', '') : undefined;

        animations.push({
          sourceElementId,
          animation: {
            ...baseAnimation,
            path,
            mpath,
            rotate: rotate === 'auto' || rotate === 'auto-reverse' ? rotate : parseFloat(rotate),
            keyPoints,
          },
          clipPathId,
          clipPathChildIndex,
          gradientId,
          patternId,
          patternChildIndex,
          filterId,
          stopIndex,
          filterPrimitiveIndex,
          maskId,
          maskChildIndex,
          markerId,
          markerChildIndex,
          symbolId,
          symbolChildIndex,
        });
        break;
      }
      case 'set': {
        const attributeName = animEl.getAttribute('attributeName') ?? undefined;
        const to = animEl.getAttribute('to') ?? undefined;

        animations.push({
          sourceElementId,
          animation: {
            ...baseAnimation,
            attributeName,
            to,
          },
          clipPathId,
          clipPathChildIndex,
          gradientId,
          patternId,
          patternChildIndex,
          filterId,
          stopIndex,
          filterPrimitiveIndex,
          maskId,
          maskChildIndex,
          markerId,
          markerChildIndex,
          symbolId,
          symbolChildIndex,
        });
        break;
      }
    }
  });

  if (animations.length === 0) return null;

  return { animation: animations };
}

/**
 * Serialize a single animation to SVG markup
 */
export function serializeAnimation(anim: SVGAnimation, chainDelays: Map<string, number>): string {
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
        !anim.mpath && anim.path ? `path="${anim.path}"` : null,
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
}

/**
 * Check if an element has pathDraw animations (stroke-dashoffset)
 */
function hasPathDrawAnimation(animations: SVGAnimation[], elementId: string): boolean {
  return animations.some(
    anim => anim.targetElementId === elementId &&
      !anim.clipPathTargetId &&
      anim.type === 'animate' &&
      anim.attributeName === 'stroke-dashoffset'
  );
}

// Register animation contribution for export
animationContributionRegistry.register({
  id: 'animation-system',
  serializeAnimations: (state, element) => {
    const animState = (state as unknown as AnimationPluginSlice);
    const animations = animState.animations ?? [];

    // Calculate chain delays fresh (not from cached state)
    const chainDelays = animState.calculateChainDelays ? animState.calculateChainDelays() : new Map<string, number>();

    // Filter animations for this element
    const elementAnimations = animations
      .filter(a => a.targetElementId === element.id && !a.clipPathTargetId)
      .filter(a => a.attributeName !== 'startOffset'); // textPath animations are handled separately

    // Serialize each animation
    const serialized: string[] = [];
    elementAnimations.forEach((anim) => {
      serialized.push(serializeAnimation(anim, chainDelays));
    });
    return serialized;
  },

  // Return additional attributes needed for pathDraw
  getExtraAttributes: (state, element): Record<string, string> => {
    const animState = (state as unknown as AnimationPluginSlice);
    const animations = animState.animations ?? [];

    if (hasPathDrawAnimation(animations, element.id)) {
      const data = element.data as { strokeDasharray?: string; pathLength?: number | string };
      const hasDash = data?.strokeDasharray && data.strokeDasharray !== 'none';
      // Only inject defaults when no dash pattern is defined; preserve author dash arrays
      if (!hasDash) {
        return {
          pathLength: data?.pathLength !== undefined ? String(data.pathLength) : '1',
          strokeDasharray: '1',
          strokeDashoffset: '0', // Start visible (final state)
        };
      }
    }
    return {};
  },
});

const animationSliceFactory = createPluginSlice(createAnimationSlice);

/**
 * Check if a node is an animation element
 */
const isAnimationTag = (tagName: string): boolean => {
  const lowerTag = tagName.toLowerCase();
  return lowerTag === 'animate' || lowerTag === 'animatetransform' || lowerTag === 'animatemotion' || lowerTag === 'set';
};

/**
 * Find animation by matching node attributes to animations in state
 */
const findAnimationForNode = (
  node: SvgStructureNodeSnapshot,
  animations: SVGAnimation[]
): SVGAnimation | undefined => {
  // Try to match by attributeName and target info from the node attributes
  const attrNameAttr = node.attributes.find((a) => a.name === 'attributeName');
  const durAttr = node.attributes.find((a) => a.name === 'dur');
  const beginAttr = node.attributes.find((a) => a.name === 'begin');
  
  // Find a matching animation based on attributes
  return animations.find((anim) => {
    // Match by type (from tagName)
    const expectedType = node.tagName.toLowerCase() === 'animatetransform' 
      ? 'animateTransform' 
      : node.tagName.toLowerCase() === 'animatemotion'
        ? 'animateMotion'
        : node.tagName.toLowerCase();
    if (anim.type !== expectedType) return false;
    
    // Match by attributeName if present
    if (attrNameAttr && anim.attributeName !== attrNameAttr.value) return false;
    
    // Match by dur if present (more specific matching)
    if (durAttr && anim.dur !== durAttr.value) return false;
    
    // Match by begin if present
    if (beginAttr && anim.begin !== beginAttr.value) return false;
    
    return true;
  });
};

/**
 * Defs editor for animation elements in the structure panel
 */
const animationDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'animation-editor',
  appliesTo: (node) => isAnimationTag(node.tagName),
  mapAttributeNameToDataKey: (name) => {
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      'attributename': 'attributeName',
      'attribute-name': 'attributeName',
      'repeatcount': 'repeatCount',
      'repeat-count': 'repeatCount',
      'repeatdur': 'repeatDur',
      'repeat-dur': 'repeatDur',
      'calcmode': 'calcMode',
      'calc-mode': 'calcMode',
      'keytimes': 'keyTimes',
      'key-times': 'keyTimes',
      'keysplines': 'keySplines',
      'key-splines': 'keySplines',
      'keypoints': 'keyPoints',
      'key-points': 'keyPoints',
      'transformtype': 'transformType',
      'type': 'transformType',
    };
    return map[normalized] ?? normalized;
  },
  update: ({ store, node, attrName, rawValue }) => {
    const animState = store as unknown as AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const updateAnimation = animState.updateAnimation;
    if (!updateAnimation || animations.length === 0) return false;
    
    const anim = findAnimationForNode(node, animations);
    if (!anim) return false;
    
    const dataKey = animationDefsEditor.mapAttributeNameToDataKey?.(attrName, {}) ?? attrName;
    
    // Parse value based on expected type
    let nextValue: unknown = rawValue;
    if (dataKey === 'repeatCount') {
      nextValue = rawValue === 'indefinite' ? 'indefinite' : parseFloat(rawValue) || 1;
    } else if (['from', 'to'].includes(dataKey)) {
      // Could be number or string
      const parsed = parseFloat(rawValue);
      nextValue = Number.isFinite(parsed) ? parsed : rawValue;
    }
    
    updateAnimation(anim.id, { [dataKey]: nextValue });
    return true;
  },
  addAttribute: ({ store, node, attrName, rawValue }) => {
    return animationDefsEditor.update({ store, node, attrName, rawValue });
  },
  removeAttribute: ({ store, node, attrName }) => {
    const animState = store as unknown as AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const updateAnimation = animState.updateAnimation;
    if (!updateAnimation || animations.length === 0) return false;
    
    const anim = findAnimationForNode(node, animations);
    if (!anim) return false;
    
    const dataKey = animationDefsEditor.mapAttributeNameToDataKey?.(attrName, {}) ?? attrName;
    updateAnimation(anim.id, { [dataKey]: undefined } as Partial<SVGAnimation>);
    return true;
  },
  removeChild: ({ store, node }) => {
    // Remove the animation itself
    const animState = store as unknown as AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const removeAnimation = animState.removeAnimation;
    if (!removeAnimation || animations.length === 0) return false;
    
    const anim = findAnimationForNode(node, animations);
    if (!anim) return false;
    
    removeAnimation(anim.id);
    return true;
  },
  revisionSelector: (state) => (state as unknown as AnimationPluginSlice).animations,
};

export const animationSystemPlugin: PluginDefinition<CanvasStore> = {
  id: 'animation-system',
  metadata: {
    label: 'Animations',
    cursor: 'default',
  },
  keyboardShortcutScope: 'global',
  slices: [animationSliceFactory],
  providers: [
    {
      id: 'gizmo-provider',
      component: GizmoProvider,
    },
  ],
  canvasOverlays: [
    {
      id: 'animation-gizmo-overlay',
      component: AnimationGizmoOverlay,
    },
  ],
  importDefs: importAnimationDefs,
  contextMenuActions: [
    {
      id: 'playback-toggle',
      action: () => {
        const state = canvasStoreApi.getState() as CanvasStore & AnimationPluginSlice;
        const animations = state.animations ?? [];
        if (animations.length === 0 || state.animationState?.isPlaying) return null;

        return {
          id: 'play-animations',
          label: 'Play Animations',
          icon: Play,
          onClick: () => {
            state.playAnimations?.();
          },
        };
      },
    },
  ],
  hooks: [
    {
      id: 'animation-timer',
      hook: useAnimationTimer,
      global: true,
    },
  ],
  overlays: [
    {
      id: 'animation-workspace-dialog',
      component: AnimationWorkspaceDialog,
      placement: 'global',
    },
  ],
  keyboardShortcuts: {
    Space: {
      handler: (_event, { store }) => {
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        if (state.animationState?.isPlaying) {
          state.pauseAnimations?.();
        } else {
          state.playAnimations?.();
        }
      },
      options: {
        preventDefault: true,
        when: (context) => (context.store.getState() as CanvasStore).activePlugin === 'animation-system',
      },
    },
    A: {
      handler: (event, { store }) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        const targetId = state.selectedIds?.[0];
        if (!targetId) return;
        state.createFadeAnimation?.(targetId);
      },
      options: {
        preventDefault: true,
        when: (context) => (context.store.getState() as CanvasStore).activePlugin === 'animation-system',
      },
    },
    R: {
      handler: (event, { store }) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        const targetId = state.selectedIds?.[0];
        if (!targetId) return;
        state.createRotateAnimation?.(targetId);
      },
      options: {
        preventDefault: true,
        when: (context) => (context.store.getState() as CanvasStore).activePlugin === 'animation-system',
      },
    },
    D: {
      handler: (event, { store }) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        const targetId = state.selectedIds?.[0];
        const selectedElement = state.elements?.find?.((el) => el.id === targetId);
        if (!targetId || selectedElement?.type !== 'path') return;
        state.createPathDrawAnimation?.(targetId);
      },
      options: {
        preventDefault: true,
        when: (context) => (context.store.getState() as CanvasStore).activePlugin === 'animation-system',
      },
    },
    'meta+enter': {
      handler: (_event, { store }) => {
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        if (state.animationState?.isPlaying) {
          state.pauseAnimations?.();
        } else {
          state.playAnimations?.();
        }
      },
      options: { preventDefault: true },
    },
    'ctrl+enter': {
      handler: (_event, { store }) => {
        const state = store.getState() as CanvasStore & AnimationPluginSlice;
        if (state.animationState?.isPlaying) {
          state.pauseAnimations?.();
        } else {
          state.playAnimations?.();
        }
      },
      options: { preventDefault: true },
    },
  },
  sidebarPanels: [createSelectOrIdlePanel('animation-controls', AnimationControlsPanel)],
  svgDefsEditors: [animationDefsEditor],
};

export type { AnimationPluginSlice };
export { generateAnimationId };

// Gizmo system exports
// eslint-disable-next-line react-refresh/only-export-components
export * from './gizmos';
// eslint-disable-next-line react-refresh/only-export-components
export * from './integration';
