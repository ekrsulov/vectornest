import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VStack,
  Text,
} from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPreset, AnimationLibrarySlice } from './types';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { AnimationItemCard } from './AnimationItemCard';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgPreview } from '../../ui/SvgPreview';

const EMPTY_PRESETS: AnimationPreset[] = [];

const selectAnimationLibraryPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & AnimationLibrarySlice;
  const selectedIds = state.selectedIds;
  const elements = state.elements;

  // Check if we have a valid selection for animations
  const hasSelection = selectedIds.length > 0;

  // Check if selection has text elements (for text-only presets)
  const hasTextSelection = selectedIds.some((id) => {
    const el = elements.find((e) => e.id === id);
    return el?.type === 'nativeText';
  });

  return {
    presets: slice.animationPresets ?? EMPTY_PRESETS,
    addPreset: slice.addAnimationPreset,
    removePreset: slice.removeAnimationPreset,
    applyPreset: slice.applyPresetToSelection,
    clearAnimations: slice.clearAnimationsFromSelection,
    hasSelection,
    hasTextSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

export const AnimationLibraryPanel: React.FC = () => {
  const {
    presets,
    applyPreset,
    clearAnimations,
    hasSelection,
    hasTextSelection,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectAnimationLibraryPanelState);

  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = React.useState<string | number | null>(null);

  useEffect(() => {
    if (!selectedFromSearch) return;
    setEditingPresetId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingPresetId && presets.length) {
      setEditingPresetId(presets[0].id);
    } else if (editingPresetId && !presets.find((preset) => preset.id === editingPresetId)) {
      setEditingPresetId(presets[0]?.id ?? null);
    }
  }, [editingPresetId, presets]);

  const editingPreset = useMemo(
    () => presets.find((preset) => preset.id === editingPresetId) ?? null,
    [editingPresetId, presets]
  );

  const getAnimationCount = (preset: AnimationPreset) => {
    let count = preset.animations.reduce((sum, anim) => {
      if (preset.centeredScale && anim.type === 'animateTransform' && anim.transformType === 'scale') {
        return sum + 2; // translate + scale
      }
      return sum + 1;
    }, 0);
    
    // Add 1 for clipPath animation if present
    if (preset.clipPathAnimation) {
      count += 1;
    }
    
    return count;
  };

  const renderItem = (preset: AnimationPreset, isSelected: boolean) => (
    <AnimationItemCard
      preset={preset}
      isSelected={isSelected}
      animationCount={getAnimationCount(preset)}
    />
  );

  // Check if the selected preset can be applied to current selection
  const canApplySelectedPreset = useMemo(() => {
    if (!hasSelection || !editingPreset) return false;
    if (editingPreset.targetType === 'text') {
      return hasTextSelection;
    }
    return true;
  }, [hasSelection, hasTextSelection, editingPreset]);

  const handleApply = () => {
    if (!editingPresetId || !canApplySelectedPreset) return;
    applyPreset?.(editingPresetId);
  };

  const handleItemDoubleClick = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    // Respect target requirements
    if (preset.targetType === 'text' && !hasTextSelection) return;
    if (!hasSelection) return;
    applyPreset?.(presetId);
    setEditingPresetId(presetId);
  }, [applyPreset, presets, hasSelection, hasTextSelection, setEditingPresetId]);

  return (
    <LibraryPanelHelper
      title="Animations"
      items={presets}
      selectedId={editingPresetId}
      onSelect={setEditingPresetId}
      onItemDoubleClick={handleItemDoubleClick}
      emptyMessage="No animation presets available."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        editingPreset ? (
          <VStack spacing={0.5} align="stretch">
            <CompactFieldRow label="Name" labelWidth="40px" compact>
              <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                {editingPreset.name}
              </Text>
            </CompactFieldRow>
            {editingPreset.description && (
              <CompactFieldRow label="Info" labelWidth="40px" compact align="flex-start">
                <Text fontSize="10px" lineHeight="1.3">
                  {editingPreset.description}
                </Text>
              </CompactFieldRow>
            )}
            <CompactFieldRow label="Target" labelWidth="40px" compact>
              <Text fontSize="10px">
                {editingPreset.targetType === 'text' ? 'Text elements' : 'Any element'}
              </Text>
            </CompactFieldRow>
            <CompactFieldRow label="Steps" labelWidth="40px" compact>
              <Text fontSize="10px">
                {getAnimationCount(editingPreset)} animation{getAnimationCount(editingPreset) !== 1 ? 's' : ''}
              </Text>
            </CompactFieldRow>
            {editingPreset.previewSvg && (
              <SvgPreview
                content={editingPreset.previewSvg}
                title="SVG Code"
                height="60px"
                showVisualPreview={true}
              />
            )}
          </VStack>
        ) : null
      }
      Actions={
        <>
          <ActionButtonGroup>
            <PanelStyledButton
              onClick={handleApply}
              isDisabled={!canApplySelectedPreset}
              w="full"
            >
              Apply to Selection
            </PanelStyledButton>
            <PanelStyledButton
              onClick={() => clearAnimations?.()}
              isDisabled={!hasSelection}
              w="full"
            >
              Clear Animations
            </PanelStyledButton>
          </ActionButtonGroup>
          {!hasSelection && (
            <StatusMessage>
              Select elements to apply animations.
            </StatusMessage>
          )}
          {editingPreset?.targetType === 'text' && hasSelection && !hasTextSelection && (
            <StatusMessage type="warning">
              This preset only works with text elements.
            </StatusMessage>
          )}
        </>
      }
    />
  );
};
