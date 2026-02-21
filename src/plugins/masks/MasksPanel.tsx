import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import type { GroupElement, CanvasElement } from '../../types';
import type { MasksSlice, MaskDefinition } from './types';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { useFrozenCanvasStoreValueDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { canvasStoreApi, useCanvasStore } from '../../store/canvasStore';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { MaskItemCard } from './MaskItemCard';
import { MASK_PRESETS, generateMaskFromPreset, type MaskBBox } from './presets';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgEditor } from '../../ui/SvgPreview';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';

const EMPTY_MASKS: MaskDefinition[] = [];

/** Recursively collect all descendant element IDs from a group */
const collectGroupDescendants = (
  groupId: string,
  elementMap: Map<string, CanvasElement>
): string[] => {
  const group = elementMap.get(groupId);
  if (!group || group.type !== 'group') return [];
  
  const groupData = (group as GroupElement).data;
  const childIds = groupData.childIds ?? [];
  const result: string[] = [];
  
  for (const childId of childIds) {
    result.push(childId);
    const child = elementMap.get(childId);
    if (child?.type === 'group') {
      result.push(...collectGroupDescendants(childId, elementMap));
    }
  }
  
  return result;
};

/** Calculate combined bounding box of selected elements (including group children) */
const calculateSelectionBBox = (state: CanvasStore): MaskBBox | null => {
  const selectedIds = state.selectedIds;
  if (selectedIds.length === 0) return null;

  const elementMap = new Map(state.elements.map((el) => [el.id, el]));
  const viewport = state.viewport;

  // Expand selection to include group children
  const expandedIds = new Set<string>();
  for (const id of selectedIds) {
    expandedIds.add(id);
    const el = elementMap.get(id);
    if (el?.type === 'group') {
      // Add all descendants
      const descendants = collectGroupDescendants(id, elementMap);
      descendants.forEach((d) => expandedIds.add(d));
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of expandedIds) {
    const el = elementMap.get(id);
    if (!el) continue;
    // Skip groups themselves, we use their children's bounds
    if (el.type === 'group') continue;
    
    const bounds = elementContributionRegistry.getBounds(el, { viewport, elementMap });
    if (bounds) {
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
  }

  if (!Number.isFinite(minX)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/** Animation tag names to look for in mask content */
const ANIMATION_SELECTORS = 'animate, animateTransform, animateMotion, set';

/** Parse SMIL animations from mask content and create animation objects */
const parseAnimationsFromMaskContent = (
  maskId: string,
  content: string
): Omit<SVGAnimation, 'id'>[] => {
  if (typeof DOMParser === 'undefined') return [];
  
  const parser = new DOMParser();
  // Wrap content in a container for parsing
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml');
  const animationElements = doc.querySelectorAll(ANIMATION_SELECTORS);
  
  if (animationElements.length === 0) return [];
  
  const animations: Omit<SVGAnimation, 'id'>[] = [];
  
  // Get all non-animation children to determine child indices
  const svg = doc.querySelector('svg');
  if (!svg) return [];
  
  // Find parent elements that contain animations
  animationElements.forEach((animEl) => {
    const parent = animEl.parentElement;
    if (!parent || parent.tagName.toLowerCase() === 'svg' || parent.tagName.toLowerCase() === 'defs') {
      return; // Skip animations not inside a shape element
    }
    
    // Find the index of this parent among non-defs, non-animation siblings
    const allChildren = Array.from(svg.children).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag !== 'defs' && !['animate', 'animatetransform', 'animatemotion', 'set'].includes(tag);
    });
    
    // Find which child index this parent is
    let childIndex = -1;
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i] === parent || allChildren[i].contains(parent)) {
        childIndex = i;
        break;
      }
    }
    
    // Determine animation type
    const tagName = animEl.tagName.toLowerCase();
    let type: SVGAnimation['type'] = 'animate';
    if (tagName === 'animatetransform') type = 'animateTransform';
    else if (tagName === 'animatemotion') type = 'animateMotion';
    else if (tagName === 'set') type = 'set';
    
    // Build animation object from attributes
    const anim: Omit<SVGAnimation, 'id'> = {
      type,
      targetElementId: '', // Will be set to preview element
      maskTargetId: maskId,
      maskChildIndex: childIndex >= 0 ? childIndex : 0,
      attributeName: animEl.getAttribute('attributeName') ?? undefined,
    };
    
    // Copy common animation attributes
    const from = animEl.getAttribute('from');
    const to = animEl.getAttribute('to');
    const values = animEl.getAttribute('values');
    const dur = animEl.getAttribute('dur');
    const begin = animEl.getAttribute('begin');
    const fill = animEl.getAttribute('fill');
    const repeatCount = animEl.getAttribute('repeatCount');
    const calcMode = animEl.getAttribute('calcMode');
    const keyTimes = animEl.getAttribute('keyTimes');
    const keySplines = animEl.getAttribute('keySplines');
    
    if (from) anim.from = from;
    if (to) anim.to = to;
    if (values) anim.values = values;
    if (dur) anim.dur = dur;
    if (begin) anim.begin = begin;
    if (fill === 'freeze' || fill === 'remove') anim.fill = fill;
    if (repeatCount) {
      anim.repeatCount = repeatCount === 'indefinite' ? 'indefinite' : parseFloat(repeatCount);
    }
    if (calcMode) anim.calcMode = calcMode as SVGAnimation['calcMode'];
    if (keyTimes) anim.keyTimes = keyTimes;
    if (keySplines) anim.keySplines = keySplines;
    
    // For animateTransform
    if (type === 'animateTransform') {
      const transformType = animEl.getAttribute('type');
      if (transformType) anim.transformType = transformType as SVGAnimation['transformType'];
    }
    
    // For animateMotion
    if (type === 'animateMotion') {
      const path = animEl.getAttribute('path');
      const rotate = animEl.getAttribute('rotate');
      if (path) anim.path = path;
      if (rotate) {
        anim.rotate = rotate === 'auto' || rotate === 'auto-reverse' 
          ? rotate 
          : parseFloat(rotate);
      }
    }
    
    animations.push(anim);
  });
  
  return animations;
};

/** Strip animation elements from content string once synced into animationSystem */
const stripAnimationsFromContent = (content: string): string => {
  if (typeof DOMParser === 'undefined') return content;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml');
  
  doc.querySelectorAll(ANIMATION_SELECTORS).forEach((el) => el.remove());
  
  const svg = doc.querySelector('svg');
  return svg?.innerHTML ?? content;
};

/** Serialize animation to SVG markup for preview */
const serializeAnimation = (anim: SVGAnimation): string => {
  const commonAttrs = [
    `dur="${anim.dur ?? '2s'}"`,
    `begin="${anim.begin ?? '0s'}"`,
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

/** Inject animations into mask content by child index */
const injectAnimationsForPreview = (
  content: string,
  animations: SVGAnimation[]
): string => {
  if (animations.length === 0) return content;
  if (typeof DOMParser === 'undefined') return content;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return content;

  // Get child elements (excluding defs and animations)
  const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);
  const childElements = Array.from(svg.children).filter((el) => {
    const tag = el.tagName.toLowerCase();
    return tag !== 'defs' && !ANIMATION_TAGS.has(tag);
  });

  // Group animations by child index
  const byIndex = new Map<number, SVGAnimation[]>();
  animations.forEach((anim) => {
    const idx = typeof anim.maskChildIndex === 'number' ? anim.maskChildIndex : 0;
    if (!byIndex.has(idx)) byIndex.set(idx, []);
    byIndex.get(idx)!.push(anim);
  });

  // Inject animations
  byIndex.forEach((anims, index) => {
    if (index >= 0 && index < childElements.length) {
      const targetEl = childElements[index];
      anims.forEach((anim) => {
        const markup = serializeAnimation(anim);
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

/** Component to display mask preview with animations */
const MaskPreviewBox: React.FC<{
  mask: MaskDefinition;
  animations: SVGAnimation[];
}> = ({ mask, animations }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  // Use contrasting colors for the example rectangle
  const rectFill = useColorModeValue('#3182CE', '#63B3ED'); // Blue that contrasts with both modes
  const bgPattern = useColorModeValue(
    'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #cbd5e0 4px, #cbd5e0 8px)',
    'repeating-linear-gradient(45deg, #2d3748, #2d3748 4px, #4a5568 4px, #4a5568 8px)'
  );

  const previewSvg = useMemo(() => {
    if (!mask.content) return null;

    // Get mask animations and inject them into the content
    const maskAnimations = animations.filter((a) => a.maskTargetId === mask.id);
    const contentWithAnimations = injectAnimationsForPreview(mask.content, maskAnimations);

    // Calculate viewBox from mask attributes or use defaults
    // Use a square for the preview
    const x = parseFloat(mask.x ?? '0') || 0;
    const y = parseFloat(mask.y ?? '0') || 0;
    const size = parseFloat(mask.width ?? '100') || 100;
    const width = size;
    const height = size;

    // Generate unique IDs for this preview to avoid conflicts
    const previewMaskId = `preview-mask-${mask.id}`;

    // Build mask attributes
    const maskAttrs = [
      `id="${previewMaskId}"`,
      mask.maskUnits ? `maskUnits="${mask.maskUnits}"` : '',
      mask.maskContentUnits ? `maskContentUnits="${mask.maskContentUnits}"` : '',
      mask.x ? `x="${mask.x}"` : '',
      mask.y ? `y="${mask.y}"` : '',
      mask.width ? `width="${mask.width}"` : '',
      mask.height ? `height="${mask.height}"` : '',
    ].filter(Boolean).join(' ');

    // Create SVG with mask definition and example rectangle
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - 5} ${y - 5} ${width + 10} ${height + 10}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <mask ${maskAttrs}>
      ${contentWithAnimations}
    </mask>
  </defs>
  <!-- Example rectangle with mask applied -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${rectFill}" mask="url(#${previewMaskId})" />
</svg>`;
  }, [mask, animations, rectFill]);

  if (!previewSvg) return null;

  return (
    <Box mb={2}>
      <LibrarySectionHeader title="Preview" compact />
      <Box
        bg={bgColor}
        background={bgPattern}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="sm"
        p={2}
        width="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        dangerouslySetInnerHTML={{ __html: previewSvg }}
        sx={{
          aspectRatio: '1 / 1',
          '& svg': {
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
          },
        }}
      />
    </Box>
  );
};

const selectMasksPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & MasksSlice;
  const selectedIds = state.selectedIds;
  const hasSelection = selectedIds.length > 0;

  let hasPathSelection = false;
  if (selectedIds.length > 0) {
    const selectedSet = new Set(selectedIds);
    for (const el of state.elements) {
      if (!selectedSet.has(el.id)) continue;
      if (el.type === 'path') {
        hasPathSelection = true;
        break;
      }
    }
  }

  let selectedMaskIdFromSelection: string | null = null;
  if (selectedIds.length === 1) {
    const selectedElement = state.elements.find((el) => el.id === selectedIds[0]);
    selectedMaskIdFromSelection = (selectedElement?.data as { maskId?: string } | undefined)?.maskId ?? null;
  }

  return {
    createMask: slice.createMaskFromSelection,
    assignMask: slice.assignMaskToSelection,
    clearMask: slice.clearMaskFromSelection,
    removeMask: slice.removeMask,
    renameMask: slice.renameMask,
    updateMask: slice.updateMask,
    hasSelection,
    hasPathSelection,
    selectedMaskIdFromSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

export const MasksPanel: React.FC = () => {
  const masks = useFrozenCanvasStoreValueDuringDrag(
    useCallback((state) => (state as CanvasStore & MasksSlice).masks ?? EMPTY_MASKS, [])
  );

  const {
    createMask,
    assignMask,
    clearMask,
    removeMask,
    renameMask,
    updateMask,
    hasSelection,
    hasPathSelection,
    selectedMaskIdFromSelection,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectMasksPanelState);

  const items = useMemo(() => masks.map((m) => ({ ...m, name: m.name ?? m.id })), [masks]);

  const [activeMaskId, setActiveMaskId] = useState<string | null>(items[0]?.id ?? null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);
  const detailsRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedFromSearch) return;
    setActiveMaskId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  // Auto-select mask when an element with maskId is selected
  useEffect(() => {
    if (!selectedMaskIdFromSelection) {
      return;
    }
    if (items.some((m) => m.id === selectedMaskIdFromSelection)) {
      setActiveMaskId(selectedMaskIdFromSelection);
    }
  }, [items, selectedMaskIdFromSelection]);

  useEffect(() => {
    if (!activeMaskId && items.length) {
      setActiveMaskId(items[0].id);
    } else if (activeMaskId && !items.find((m) => m.id === activeMaskId)) {
      setActiveMaskId(items[0]?.id ?? null);
    }
  }, [activeMaskId, items]);

  const activeMask = useMemo(
    () => items.find((mask) => mask.id === activeMaskId) ?? null,
    [activeMaskId, items]
  );

  // Get animations from the store (for preview)
  const animations = useCanvasStore(
    useCallback((state) => {
      const animState = state as unknown as AnimationPluginSlice;
      return animState.animations ?? [];
    }, [])
  );

  // Generate SVG content for the mask
  const maskSvgContent = useMemo(() => {
    if (!activeMask) return '';
    // Use content directly as it contains the SVG markup
    return activeMask.content || '';
  }, [activeMask]);

  const handleSvgChange = useCallback((newContent: string) => {
    if (!activeMaskId || !updateMask) return;
    updateMask(activeMaskId, { content: newContent });
  }, [activeMaskId, updateMask]);

  const handleRename = (value: string) => {
    if (!activeMaskId) return;
    renameMask?.(activeMaskId, value);
  };

  const ensureMaskAnimationsRegistered = useCallback((maskId: string, contentOverride?: string) => {
    const mask = items.find((item) => item.id === maskId);
    const content = contentOverride ?? mask?.content;
    if (!content?.trim()) return;

    const parsedAnimations = parseAnimationsFromMaskContent(maskId, content);
    if (parsedAnimations.length === 0) return;

    const cleanedContent = stripAnimationsFromContent(content);
    if (cleanedContent !== content) {
      updateMask?.(maskId, { content: cleanedContent });
    }

    const currentState = canvasStoreApi.getState() as unknown as AnimationPluginSlice;
    const alreadyRegistered = (currentState.animations ?? []).some((anim) => anim.maskTargetId === maskId);
    if (alreadyRegistered || !currentState.addAnimation) return;

    parsedAnimations.forEach((anim) => {
      currentState.addAnimation?.(anim);
    });
  }, [items, updateMask]);

  const applyMaskToSelection = useCallback((maskId: string) => {
    if (!hasSelection) return;
    const selectionBBox = calculateSelectionBBox(canvasStoreApi.getState());
    if (!selectionBBox) {
      ensureMaskAnimationsRegistered(maskId);
      assignMask?.(maskId);
      setActiveMaskId(maskId);
      return;
    }

    const mask = items.find((m) => m.id === maskId);
    let contentForAnimationRegistration: string | undefined;
    if (mask && updateMask) {
      const preset = MASK_PRESETS.find((p) => p.id === mask.presetId);
      if (preset) {
        const regenerated = generateMaskFromPreset(preset, selectionBBox);
        contentForAnimationRegistration = regenerated.content;
        updateMask(maskId, {
          id: mask.id,
          name: mask.name ?? regenerated.name,
          width: regenerated.width,
          height: regenerated.height,
          x: regenerated.x,
          y: regenerated.y,
          maskUnits: regenerated.maskUnits,
          maskContentUnits: regenerated.maskContentUnits,
          content: regenerated.content,
          originX: regenerated.originX,
          originY: regenerated.originY,
          version: (mask.version ?? 0) + 1,
          presetId: preset.id,
        });
      } else {
        const baseW = parseFloat(mask.width ?? '100') || 100;
        const baseH = parseFloat(mask.height ?? '100') || 100;
        const scaleX = selectionBBox.width / baseW;
        const scaleY = selectionBBox.height / baseH;
        const translateX = selectionBBox.x - (parseFloat(mask.x ?? '0') || 0);
        const translateY = selectionBBox.y - (parseFloat(mask.y ?? '0') || 0);
        const wrap = (content: string) =>
          `<g transform="translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})">${content}</g>`;
        const nextContent = wrap(mask.content);
        contentForAnimationRegistration = nextContent;

        updateMask(maskId, {
          x: String(selectionBBox.x),
          y: String(selectionBBox.y),
          width: String(selectionBBox.width),
          height: String(selectionBBox.height),
          maskUnits: 'userSpaceOnUse',
          maskContentUnits: 'userSpaceOnUse',
          content: nextContent,
        });
      }
    } else if (mask) {
      contentForAnimationRegistration = mask.content;
    }

    ensureMaskAnimationsRegistered(maskId, contentForAnimationRegistration);
    assignMask?.(maskId);
    setActiveMaskId(maskId);
  }, [assignMask, ensureMaskAnimationsRegistered, hasSelection, items, updateMask]);

  const handleAssign = () => {
    if (!activeMaskId) return;
    applyMaskToSelection(activeMaskId);
  };

  const handleAdd = () => {
    if (hasPathSelection) createMask?.();
  };

  const handleAddPreset = useCallback((presetId: string) => {
    const preset = MASK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    
    // Calculate selection bounding box at the moment of adding
    const selectionBBox = calculateSelectionBBox(canvasStoreApi.getState());
    const bbox = selectionBBox ?? { x: 0, y: 0, width: 100, height: 100 };
    
    // Generate dynamic mask from preset and bounding box
    const generatedMask = generateMaskFromPreset(preset, bbox);
    
    const newMask: MaskDefinition = {
      id: generatedMask.id,
      name: generatedMask.name,
      width: generatedMask.width,
      height: generatedMask.height,
      x: generatedMask.x,
      y: generatedMask.y,
      maskUnits: generatedMask.maskUnits,
      maskContentUnits: generatedMask.maskContentUnits,
      content: generatedMask.content,
      presetId: preset.id,
      originX: generatedMask.originX,
      originY: generatedMask.originY,
      version: generatedMask.version,
    };
    
    canvasStoreApi.setState((state) => {
      const maskState = state as unknown as MasksSlice;
      const masksList = maskState.masks ?? [];
      return {
        masks: [...masksList, newMask],
      } as Partial<MasksSlice>;
    });
    
    // Auto-select the new mask
    setActiveMaskId(newMask.id);
  }, [setActiveMaskId]);

  // Prevent double-load in StrictMode mounts
  const hasAutoLoadedRef = useRef(false);

  // Auto-load all presets on first render, skipping any that are already present.
  // We cannot simply check items.length === 0 because an SVG import may have
  // added masks before the panel was first opened, which would wrongly prevent
  // the built-in presets from being added altogether.
  useEffect(() => {
    if (hasAutoLoadedRef.current) return;
    hasAutoLoadedRef.current = true;
    const existingPresetIds = new Set(
      items.map((m) => (m as MaskDefinition & { presetId?: string }).presetId).filter(Boolean)
    );
    MASK_PRESETS.forEach((p) => {
      if (!existingPresetIds.has(p.id)) {
        handleAddPreset(p.id);
      }
    });
  }, [items, handleAddPreset]);

  const renderItem = (mask: MaskDefinition & { name: string }, isSelected: boolean) => (
    <MaskItemCard
      mask={mask}
      isSelected={isSelected}
      onDoubleClick={hasSelection ? () => applyMaskToSelection(mask.id) : undefined}
    />
  );

  return (
    <LibraryPanelHelper
      title="Masks"
      items={items}
      selectedId={activeMaskId}
      onSelect={setActiveMaskId}
      onAdd={hasPathSelection ? handleAdd : undefined}
      onDelete={(id) => removeMask?.(id)}
      emptyMessage="Import masks or capture one from a selected path."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        activeMask ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={activeMask.name ?? activeMask.id}
                  onChange={handleRename}
                  placeholder="Mask name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <Text fontSize="xs" color="gray.500" mb={2}>
              Units: {activeMask.maskUnits ?? 'objectBoundingBox'}
            </Text>
            <MaskPreviewBox mask={activeMask} animations={animations} />
            <SvgEditor
              content={maskSvgContent}
              onChange={handleSvgChange}
              height="80px"
              showPreview={false}
            />
          </>
        ) : null
      }
      Actions={
        <>
          <ActionButtonGroup>
            <PanelStyledButton onClick={handleAssign} isDisabled={!activeMask || !hasSelection} w="full">
              Apply mask
            </PanelStyledButton>
            <PanelStyledButton onClick={() => clearMask?.()} isDisabled={!hasSelection} w="full">
              Clear masks
            </PanelStyledButton>
          </ActionButtonGroup>
          {!hasSelection && (
            <StatusMessage>
              Select an element to apply or clear masks.
            </StatusMessage>
          )}
        </>
      }
    />
  );
};
