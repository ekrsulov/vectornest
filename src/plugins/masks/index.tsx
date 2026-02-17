import type { PluginDefinition, PluginSliceFactory, SvgDefsEditor } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { definitionTranslationRegistry } from '../../utils/definitionTranslationRegistry';
import { createMasksSlice } from './slice';
import type { MaskDefinition, MasksSlice } from './types';
import type { CanvasElement } from '../../types';
import { MasksPanel } from './MasksPanel';
import type { SVGAnimation, AnimationPluginSlice } from '../animationSystem/types';
import './persistence';
import './importContribution';
import { generateShortId } from '../../utils/idGenerator';

const masksSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createMasksSlice(set as any, get as any, api as any);
  return { state: slice };
};

const maskDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'masks-editor',
  appliesTo: (node) => {
    if (!node.isDefs) return false;
    if (node.tagName === 'mask') return true;
    return Boolean(node.defsOwnerId);
  },
  update: () => false,
  removeChild: ({ store, node }) => {
    const maskState = store as unknown as MasksSlice;
    const mask = (maskState.masks ?? []).find((m) => m.id === (node.defsOwnerId ?? node.idAttribute));
    const updateMask = maskState.updateMask;
    const removeMask = maskState.removeMask;
    if (!mask) return false;

    // Delete the mask itself
    if (node.tagName === 'mask') {
      removeMask?.(mask.id);
      return true;
    }

    // If this is an animation node (no childIndex), remove the whole mask
    if (node.childIndex === undefined) {
      removeMask?.(mask.id);
      return true;
    }

    if (typeof DOMParser === 'undefined') return false;
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<mask>${mask.content ?? ''}</mask>`, 'image/svg+xml');
    const maskEl = doc.querySelector('mask');
    if (!maskEl) return false;
    const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
    const children = Array.from(maskEl.children).filter((el) => !ANIMATION_TAGS.has(el.tagName.toLowerCase()));
    if (node.childIndex === undefined || node.childIndex < 0 || node.childIndex >= children.length) return false;
    const target = children[node.childIndex];
    target.parentElement?.removeChild(target);
    const nextContent = maskEl.innerHTML;
    updateMask?.(mask.id, { content: nextContent });
    return true;
  },
  revisionSelector: (state) => (state as unknown as MasksSlice).masks,
};

/**
 * Serialize mask animation to SVG markup
 */
const serializeMaskAnimation = (anim: SVGAnimation, chainDelays: Map<string, number>): string => {
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

/**
 * Inject animations into mask content.
 * Supports two modes:
 * 1. By targetElementId - for masks with IDs on child elements
 * 2. By maskChildIndex - for masks where we target the nth child element
 */
const injectAnimationsIntoMaskContent = (
  content: string,
  animations: SVGAnimation[],
  chainDelays: Map<string, number>
): string => {
  if (animations.length === 0) return content;

  // Parse content
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return content;

  // Get child elements (excluding defs and animations) for index-based injection
  const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
  const childElements = Array.from(svg.children).filter((el) => {
    const tag = el.tagName.toLowerCase();
    return tag !== 'defs' && !ANIMATION_TAGS.has(tag);
  });

  // Group animations by target
  const byId = new Map<string, SVGAnimation[]>();
  const byIndex = new Map<number, SVGAnimation[]>();

  animations.forEach((anim) => {
    // If there's a maskChildIndex, use index-based injection
    if (typeof anim.maskChildIndex === 'number' && anim.maskChildIndex >= 0) {
      if (!byIndex.has(anim.maskChildIndex)) byIndex.set(anim.maskChildIndex, []);
      byIndex.get(anim.maskChildIndex)!.push(anim);
    } else if (anim.targetElementId) {
      // Otherwise use ID-based injection
      if (!byId.has(anim.targetElementId)) byId.set(anim.targetElementId, []);
      byId.get(anim.targetElementId)!.push(anim);
    } else {
      // Fallback: inject at index 0
      if (!byIndex.has(0)) byIndex.set(0, []);
      byIndex.get(0)!.push(anim);
    }
  });

  // Inject by index
  byIndex.forEach((anims, index) => {
    if (index >= 0 && index < childElements.length) {
      const targetEl = childElements[index];
      anims.forEach((anim) => {
        const markup = serializeMaskAnimation(anim, chainDelays);
        // Parse the animation markup and append to target
        const animDoc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml');
        const animEl = animDoc.querySelector('svg')?.firstElementChild;
        if (animEl) {
          targetEl.appendChild(doc.importNode(animEl, true));
        }
      });
    }
  });

  // Inject by ID
  byId.forEach((anims, id) => {
    const targetEl = svg.querySelector(`[id="${id}"]`);
    if (targetEl) {
      anims.forEach((anim) => {
        const markup = serializeMaskAnimation(anim, chainDelays);
        const animDoc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml');
        const animEl = animDoc.querySelector('svg')?.firstElementChild;
        if (animEl) {
          targetEl.appendChild(doc.importNode(animEl, true));
        }
      });
    }
  });

  return svg.innerHTML;
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

const importMaskDefs = (doc: Document): Record<string, MaskDefinition[]> | null => {
  const nodes = Array.from(doc.querySelectorAll('mask'));
  if (!nodes.length) return null;

  const defs: MaskDefinition[] = nodes.map((node) => {
    const id = node.getAttribute('id') ?? generateShortId('msk');
    const x = node.getAttribute('x') ?? undefined;
    const y = node.getAttribute('y') ?? undefined;
    const width = node.getAttribute('width') ?? undefined;
    const height = node.getAttribute('height') ?? undefined;
    const maskUnits = node.getAttribute('maskUnits') ?? undefined;
    const maskContentUnits = node.getAttribute('maskContentUnits') ?? undefined;
    // Strip animations - they are imported separately by the animation system
    const content = stripAnimationsFromContent(node);
    return { id, name: id, x, y, width, height, maskUnits, maskContentUnits, content };
  });

  return defs.length ? { mask: defs } : null;
};

const collectUsedMaskIds = (elements: CanvasElement[]): Set<string> => {
  const used = new Set<string>();
  elements.forEach((el) => {
    const data = el.data as { maskId?: string } | undefined;
    if (data?.maskId) {
      used.add(data.maskId);
    }
  });
  return used;
};

defsContributionRegistry.register({
  id: 'masks',
  collectUsedIds: collectUsedMaskIds,
  renderDefs: (state, usedIds) => {
    const maskState = state as unknown as MasksSlice & AnimationPluginSlice;
    const masks = maskState.masks ?? [];
    const animations = maskState.animations ?? [];
    const chainDelays = maskState.calculateChainDelays ? maskState.calculateChainDelays() : new Map<string, number>();
    const isActive = (maskState.animationState?.isPlaying ?? false)
      || (maskState.animationState?.hasPlayed ?? false)
      || (maskState.animationState?.isWorkspaceOpen ?? false);
    const restartKey = maskState.animationState?.restartKey ?? 0;
    
    return masks
      .filter((m) => usedIds.has(m.id))
      .map((m) => {
        // Calculate offset for userSpaceOnUse masks
        // This represents how much the element has moved from its original position
        const originX = m.originX ?? 0;
        const originY = m.originY ?? 0;
        
        // Find animations targeting this mask and inject them
        const maskAnimations = isActive ? animations.filter((a) => a.maskTargetId === m.id) : [];
        const content = injectAnimationsIntoMaskContent(m.content, maskAnimations, chainDelays);
        
        // Parse content to React elements and wrap in group with transform if needed
        // Use dangerouslySetInnerHTML to preserve SMIL animations which don't work with React elements
        const needsTranslate = m.maskUnits === 'userSpaceOnUse' && (originX !== 0 || originY !== 0);
        const wrappedContent = needsTranslate
          ? `<g transform="translate(${originX}, ${originY})">${content}</g>`
          : content;
        
        // Calculate translated mask bounds for userSpaceOnUse masks
        // The mask's x/y/width/height define the clipping region - must follow the element
        let maskX = m.x;
        let maskY = m.y;
        if (needsTranslate) {
          const baseX = parseFloat(m.x ?? '0') || 0;
          const baseY = parseFloat(m.y ?? '0') || 0;
          maskX = String(baseX + originX);
          maskY = String(baseY + originY);
        }
        
        // Use versioned ID to force browser cache invalidation when mask position changes
        // Both the mask element and elements referencing it will use this versioned ID
        const maskVersion = m.version ?? 0;
        const runtimeId = maskVersion > 0 ? `${m.id}-v${maskVersion}` : m.id;
        
        return (
          <mask
            key={`${m.id}-${restartKey}-v${maskVersion}`}
            id={runtimeId}
            x={maskX}
            y={maskY}
            width={m.width}
            height={m.height}
            maskUnits={m.maskUnits}
            maskContentUnits={m.maskContentUnits}
            dangerouslySetInnerHTML={{ __html: wrappedContent }}
          />
        );
      });
  },
  serializeDefs: (state, usedIds) => {
    const maskState = state as unknown as MasksSlice & AnimationPluginSlice;
    const masks = maskState.masks ?? [];
    const animations = maskState.animations ?? [];
    const chainDelays = maskState.calculateChainDelays ? maskState.calculateChainDelays() : new Map<string, number>();
    
    return masks
      .filter((m) => usedIds.has(m.id))
      .map((m) => {
        // Calculate offset for userSpaceOnUse masks (element movement tracking)
        const originX = m.originX ?? 0;
        const originY = m.originY ?? 0;
        const needsTranslate = m.maskUnits === 'userSpaceOnUse' && (originX !== 0 || originY !== 0);
        
        // Apply offset to mask bounds
        let maskX = m.x;
        let maskY = m.y;
        if (needsTranslate) {
          const baseX = parseFloat(m.x ?? '0') || 0;
          const baseY = parseFloat(m.y ?? '0') || 0;
          maskX = String(baseX + originX);
          maskY = String(baseY + originY);
        }
        
        const attrs: string[] = [`id="${m.id}"`];
        if (maskX) attrs.push(`x="${maskX}"`);
        if (maskY) attrs.push(`y="${maskY}"`);
        if (m.width) attrs.push(`width="${m.width}"`);
        if (m.height) attrs.push(`height="${m.height}"`);
        if (m.maskUnits) attrs.push(`maskUnits="${m.maskUnits}"`);
        if (m.maskContentUnits) attrs.push(`maskContentUnits="${m.maskContentUnits}"`);
        
        // Find animations targeting this mask and inject them
        const maskAnimations = animations.filter((a) => a.maskTargetId === m.id);
        const content = injectAnimationsIntoMaskContent(m.content, maskAnimations, chainDelays);
        
        // Wrap content with translate for moved masks (userSpaceOnUse)
        const wrappedContent = needsTranslate
          ? `<g transform="translate(${originX}, ${originY})">${content}</g>`
          : content;
        
        return `<mask ${attrs.join(' ')}>${wrappedContent}</mask>`;
      });
  },
});

// Register definition translation contribution to update mask positions when elements move
definitionTranslationRegistry.register({
  id: 'masks',
  translateDefinitions: (context, state, setState) => {
    const maskState = state as CanvasStore & MasksSlice;
    const masks = maskState.masks ?? [];
    if (masks.length === 0) return;

    // Collect all mask IDs used by moved elements
    const allMovedIds = new Set([...context.movedElementIds, ...context.movedGroupIds]);
    const usedMaskIds = new Set<string>();
    
    // Also check descendants of moved groups
    const movedDescendantIds = new Set<string>();
    context.movedGroupIds.forEach((groupId) => {
      const descendants = maskState.getGroupDescendants?.(groupId) ?? [];
      descendants.forEach((id) => movedDescendantIds.add(id));
    });

    const elementsToCheck = new Set([...allMovedIds, ...movedDescendantIds]);

    // Check both path and group elements for maskId
    (state.elements ?? []).forEach((el) => {
      if (!elementsToCheck.has(el.id)) return;
      const data = el.data as Record<string, unknown>;
      if (data?.maskId && typeof data.maskId === 'string') {
        usedMaskIds.add(data.maskId);
      }
    });

    if (usedMaskIds.size === 0) return;

    // Update mask definitions that use userSpaceOnUse
    const updatedMasks = masks.map((mask) => {
      if (!usedMaskIds.has(mask.id)) return mask;
      // Only translate masks with userSpaceOnUse (absolute coordinates)
      if (mask.maskUnits !== 'userSpaceOnUse') return mask;
      
      const newOriginX = (mask.originX ?? 0) + context.deltaX;
      const newOriginY = (mask.originY ?? 0) + context.deltaY;
      const newVersion = (mask.version ?? 0) + 1;
      
      // Update origin offset (applied as transform when rendering)
      // Increment version to force browser to re-render the mask
      return {
        ...mask,
        originX: newOriginX,
        originY: newOriginY,
        version: newVersion,
      };
    });

    // Only update state if something changed
    const hasChanges = updatedMasks.some((mask, i) => mask !== masks[i]);
    if (hasChanges) {
      setState(() => ({ masks: updatedMasks } as Partial<CanvasStore>));
    }
  },
});

export const masksPlugin: PluginDefinition<CanvasStore> = {
  id: 'masks',
  metadata: {
    label: 'Masks',
    cursor: 'default',
  },
  slices: [masksSliceFactory],
  svgDefsEditors: [maskDefsEditor],
  importDefs: importMaskDefs,
  styleAttributeExtractor: (element) => {
    const maskAttr = element.getAttribute('mask');
    if (maskAttr) {
      const match = maskAttr.match(/url\(#([^)]+)\)/);
      if (match) return { maskId: match[1] };
    }
    return {};
  },
  relatedPluginPanels: [
    {
      id: 'masks-panel',
      targetPlugin: 'library',
      component: MasksPanel,
      order: 5,
    },
  ],
};

export type { MasksSlice, MaskDefinition };
export { collectMaskIds, parseMaskDefs, ensureMaskImports } from './importer';
