import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import type { ClippingPluginSlice, ClipDefinition } from './slice';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { useFrozenCanvasStoreValueDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { ClipItemCard } from './ClipItemCard';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgEditor } from '../../ui/SvgPreview';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import { subPathsToPathString } from '../pencil/utils';
import { CLIPPATH_PRESETS } from './presets';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { generateShortId } from '../../utils/idGenerator';
import { canvasStoreApi } from '../../store/canvasStore';

/** Animation tag names to look for in clip content */
const ANIMATION_SELECTORS = 'animate, animateTransform, animateMotion, set';

/** Parse SMIL animations from clipPath content and create animation objects */
const parseAnimationsFromClipContent = (
  clipId: string,
  content: string
): Omit<SVGAnimation, 'id'>[] => {
  if (typeof DOMParser === 'undefined') return [];
  
  const parser = new DOMParser();
  // Wrap content in a container for parsing
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml');
  const animationElements = doc.querySelectorAll(ANIMATION_SELECTORS);
  
  if (animationElements.length === 0) return [];
  
  const animations: Omit<SVGAnimation, 'id'>[] = [];
  
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
      clipPathTargetId: clipId,
      clipPathChildIndex: childIndex >= 0 ? childIndex : 0,
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

const EMPTY_CLIPS: ClipDefinition[] = [];

const selectClippingPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & ClippingPluginSlice;
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

  let selectedClipIdFromSelection: string | null = null;
  if (selectedIds.length === 1) {
    const selectedElement = state.elements.find((el) => el.id === selectedIds[0]);
    if (selectedElement) {
      const data = selectedElement.data as Record<string, unknown>;
      const clipPathTemplateId = data.clipPathTemplateId as string | undefined;
      const clipPathId = data.clipPathId as string | undefined;
      selectedClipIdFromSelection = clipPathTemplateId || clipPathId || null;
    }
  }

  return {
    createClip: slice.createClipFromSelection,
    addClipFromRawContent: slice.addClipFromRawContent,
    assignClip: slice.assignClipToSelection,
    clearClip: slice.clearClipFromSelection,
    removeClip: slice.removeClip,
    renameClip: slice.renameClip,
    updateClip: slice.updateClip,
    hasSelection,
    hasPathSelection,
    selectedClipIdFromSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

/** Component to display clipPath preview with animations */
const ClipPreviewBox: React.FC<{
  clip: ClipDefinition;
}> = ({ clip }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const rectFill = useColorModeValue('#3182CE', '#63B3ED');
  const bgPattern = useColorModeValue(
    'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #cbd5e0 4px, #cbd5e0 8px)',
    'repeating-linear-gradient(45deg, #2d3748, #2d3748 4px, #4a5568 4px, #4a5568 8px)'
  );

  const previewSvg = useMemo(() => {
    // Get content - prefer rawContent, otherwise generate from pathData
    let clipContent = clip.rawContent ?? '';
    if (!clipContent && clip.pathData) {
      const d = subPathsToPathString(clip.pathData.subPaths);
      clipContent = `<path d="${d}"/>`;
    }
    if (!clipContent) return null;

    // Calculate bounds for viewBox - use actual clip bounds
    const bounds = clip.bounds ?? { minX: 0, minY: 0, width: 100, height: 100 };
    const x = bounds.minX ?? 0;
    const y = bounds.minY ?? 0;
    const width = bounds.width || 100;
    const height = bounds.height || 100;
    // Add padding around the clip
    const padding = Math.max(width, height) * 0.1;

    const previewClipId = `preview-clip-${clip.id}`;

    // Create SVG with clip definition and example rectangle that fills the clip area
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - padding} ${y - padding} ${width + padding * 2} ${height + padding * 2}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <clipPath id="${previewClipId}">
      ${clipContent}
    </clipPath>
  </defs>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${rectFill}" clip-path="url(#${previewClipId})" />
</svg>`;
  }, [clip, rectFill]);

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

export const ClippingPanel: React.FC = () => {
  const clips = useFrozenCanvasStoreValueDuringDrag(
    useCallback((state) => (state as CanvasStore & ClippingPluginSlice).clips ?? EMPTY_CLIPS, [])
  );

  const {
    createClip,
    addClipFromRawContent,
    assignClip,
    clearClip,
    removeClip,
    renameClip,
    updateClip,
    hasSelection,
    hasPathSelection,
    selectedClipIdFromSelection,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectClippingPanelState);

  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = React.useState<string | number | null>(null);

  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setActiveClipId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  // Auto-select clip when element with clipPath is selected
  useEffect(() => {
    if (!selectedClipIdFromSelection) {
      return;
    }
    if (clips.some((clip) => clip.id === selectedClipIdFromSelection)) {
      setActiveClipId(selectedClipIdFromSelection);
    }
  }, [clips, selectedClipIdFromSelection]);

  useEffect(() => {
    if (!activeClipId && clips.length) {
      setActiveClipId(clips[0].id);
    } else if (activeClipId && !clips.find((clip) => clip.id === activeClipId)) {
      setActiveClipId(clips[0]?.id ?? null);
    }
  }, [activeClipId, clips]);

  const activeClip = useMemo(
    () => clips.find((clip) => clip.id === activeClipId) ?? null,
    [activeClipId, clips]
  );

  // Generate SVG content for the clip (just the content, not full SVG)
  const clipSvgContent = useMemo(() => {
    if (!activeClip) return '';
    // Prefer rawContent if available
    if (activeClip.rawContent) return activeClip.rawContent;
    // Generate from pathData
    const { pathData } = activeClip;
    if (!pathData) return '';
    const d = subPathsToPathString(pathData.subPaths);
    return `<path d="${d}"/>`;
  }, [activeClip]);

  const handleSvgChange = useCallback((newContent: string) => {
    if (!activeClipId || !updateClip) return;
    updateClip(activeClipId, { rawContent: newContent });
  }, [activeClipId, updateClip]);

  const handleRename = (value: string) => {
    if (!activeClipId) return;
    renameClip?.(activeClipId, value);
  };

  const ensureClipAnimationsRegistered = useCallback((clipId: string) => {
    const clip = clips.find((item) => item.id === clipId);
    const rawContent = clip?.rawContent;
    if (!rawContent?.trim()) return;

    const parsedAnimations = parseAnimationsFromClipContent(clipId, rawContent);
    if (parsedAnimations.length === 0) return;

    const currentState = canvasStoreApi.getState() as unknown as AnimationPluginSlice;
    const alreadyRegistered = (currentState.animations ?? []).some((anim) => anim.clipPathTargetId === clipId);
    if (alreadyRegistered || !currentState.addAnimation) return;

    parsedAnimations.forEach((anim) => {
      currentState.addAnimation?.({ ...anim, id: `anim-${generateShortId('clip')}` });
    });
  }, [clips]);

  const handleAssign = () => {
    if (!activeClipId) return;
    ensureClipAnimationsRegistered(activeClipId);
    assignClip?.(activeClipId);
  };

  const handleItemDoubleClick = useCallback((clipId: string) => {
    if (!hasSelection) return;
    ensureClipAnimationsRegistered(clipId);
    assignClip?.(clipId);
    setActiveClipId(clipId);
  }, [assignClip, ensureClipAnimationsRegistered, hasSelection, setActiveClipId]);

  const handleAdd = () => {
    if (hasPathSelection) createClip?.();
  };

  const presetsLoadedRef = useRef(false);
  const addPresetClip = useCallback((presetId?: string) => {
    const preset = presetId ? CLIPPATH_PRESETS.find(p => p.id === presetId) : undefined;
    const targets = preset ? [preset] : CLIPPATH_PRESETS;
    const bbox = { x: 0, y: 0, width: 100, height: 100 };

    targets.forEach((p) => {
      if (!p) return;
      const content = p.generateContent(bbox);
      addClipFromRawContent?.(content, p.name, { minX: 0, minY: 0, width: 100, height: 100 });
    });
  }, [addClipFromRawContent]);

  useEffect(() => {
    if (presetsLoadedRef.current) return;
    presetsLoadedRef.current = true;
    // Add only the presets that are not yet present.
    // We cannot simply check clips.length > 0 because an SVG import may have
    // added clips before the panel was first opened, which would wrongly prevent
    // the built-in presets from being added altogether.
    const existingNames = new Set((clips ?? []).map((c) => c.name));
    const bbox = { x: 0, y: 0, width: 100, height: 100 };
    CLIPPATH_PRESETS.forEach((p) => {
      if (existingNames.has(p.name)) return;
      const content = p.generateContent(bbox);
      addClipFromRawContent?.(content, p.name, { minX: 0, minY: 0, width: 100, height: 100 });
    });
  }, [addPresetClip, clips, addClipFromRawContent]);

  // Custom render for the item
  const renderItem = (clip: ClipDefinition, isSelected: boolean) => (
    <ClipItemCard
      clip={clip}
      isSelected={isSelected}
    />
  );

  return (
    <LibraryPanelHelper
      title="Clipping"
      items={clips}
      selectedId={activeClipId}
      onSelect={setActiveClipId}
      onItemDoubleClick={handleItemDoubleClick}
      onAdd={hasPathSelection ? handleAdd : undefined}
      onDelete={(id) => removeClip?.(id)}
      emptyMessage="Select a path and capture it as a clipping mask."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        activeClip ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={activeClip.name}
                  onChange={handleRename}
                  placeholder="Clip name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <ClipPreviewBox clip={activeClip} />
            <SvgEditor
              content={clipSvgContent}
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
            <PanelStyledButton onClick={handleAssign} isDisabled={!activeClip || !hasSelection} w="full">
              Apply clip
            </PanelStyledButton>
            <PanelStyledButton onClick={() => clearClip?.()} isDisabled={!hasSelection} w="full">
              Clear clips
            </PanelStyledButton>
          </ActionButtonGroup>
          {!hasSelection && (
            <StatusMessage>
              Select an element to apply or clear clips.
            </StatusMessage>
          )}
        </>
      }
    />
  );
};
