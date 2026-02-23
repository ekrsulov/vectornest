/**
 * AnimationEditor — Zone 2: Full property editor for the selected animation.
 *
 * Uses the shared AnimationCard component for editing existing animations.
 * Provides a creation form for new animations with the exhaustive
 * attribute options per type.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import { Panel } from '../../../ui/Panel';
import { SliderControl } from '../../../ui/SliderControl';
import { CustomSelect } from '../../../ui/CustomSelect';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { PanelTextInput } from '../../../ui/PanelTextInput';
import { AnimationCard } from '../../../ui/AnimationCard';

import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { SVGAnimation, AnimationPluginSlice, AnimationType } from '../../animationSystem/types';
import type { AnimationManagerSlice, EditorMode } from '../types';
import {
  getAnimationTypeOptions,
  getAttributeOptionsForType,
} from '../../../ui/animationAttributeOptions';
import { useShallow } from 'zustand/react/shallow';

// ─── Store Selector ─────────────────────────────────────────────────────────

interface EditorStoreSlice {
  selectedAnimationId: string | null;
  editorMode: EditorMode;
  defaultDuration: number;
  autoPlayOnEdit: boolean;
  updateAnimationManagerState: AnimationManagerSlice['updateAnimationManagerState'];
  animations: SVGAnimation[];
  elements: CanvasStore['elements'];
  updateAnimation: AnimationPluginSlice['updateAnimation'];
  addAnimation: AnimationPluginSlice['addAnimation'];
  removeAnimation: AnimationPluginSlice['removeAnimation'];
  playAnimations: AnimationPluginSlice['playAnimations'];
  selectedIds: string[];
}

const selectEditorState = (state: CanvasStore): EditorStoreSlice => {
  const aSlice = state as unknown as AnimationPluginSlice;
  const mSlice = state as unknown as AnimationManagerSlice;
  return {
    selectedAnimationId: mSlice.animationManager?.selectedAnimationId ?? null,
    editorMode: (mSlice.animationManager?.editorMode ?? 'idle') as EditorMode,
    defaultDuration: mSlice.animationManager?.defaultDuration ?? 1.5,
    autoPlayOnEdit: mSlice.animationManager?.autoPlayOnEdit ?? true,
    updateAnimationManagerState: mSlice.updateAnimationManagerState,
    animations: aSlice.animations ?? [],
    elements: state.elements,
    updateAnimation: aSlice.updateAnimation,
    addAnimation: aSlice.addAnimation,
    removeAnimation: aSlice.removeAnimation,
    playAnimations: aSlice.playAnimations,
    selectedIds: state.selectedIds,
  };
};

// ─── Component ──────────────────────────────────────────────────────────────

export const AnimationEditor: React.FC = () => {
  const {
    selectedAnimationId,
    editorMode,
    defaultDuration,
    autoPlayOnEdit,
    updateAnimationManagerState,
    animations,
    elements,
    updateAnimation,
    addAnimation,
    removeAnimation,
    playAnimations,
    selectedIds,
  } = useCanvasStore(useShallow(selectEditorState));

  // Draft state for creating new animations
  const [draftType, setDraftType] = useState<AnimationType>('animate');
  const [draftAttr, setDraftAttr] = useState('opacity');
  const [draftFrom, setDraftFrom] = useState('0');
  const [draftTo, setDraftTo] = useState('1');
  const [draftDur, setDraftDur] = useState(defaultDuration);

  const selectedAnimation = useMemo(
    () => animations.find((a) => a.id === selectedAnimationId) ?? null,
    [animations, selectedAnimationId],
  );

  // ── Editing handlers (delegated to AnimationCard) ─────────────────────

  const handleUpdate = useCallback(
    (id: string, updates: Partial<SVGAnimation>) => {
      if (!updateAnimation) return;
      updateAnimation(id, updates);
      if (autoPlayOnEdit) {
        playAnimations?.();
      }
    },
    [updateAnimation, autoPlayOnEdit, playAnimations],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!removeAnimation) return;
      removeAnimation(id);
      updateAnimationManagerState?.({
        selectedAnimationId: null,
        editorMode: 'idle',
      });
    },
    [removeAnimation, updateAnimationManagerState],
  );

  // ── Creation handlers ───────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!addAnimation || selectedIds.length === 0) return;
    const targetId = selectedIds[0];
    const newAnim: Omit<SVGAnimation, 'id'> = {
      type: draftType,
      targetElementId: targetId,
      attributeName: draftType === 'animateMotion' ? undefined : draftAttr,
      from: draftFrom,
      to: draftTo,
      dur: `${draftDur}s`,
      fill: 'freeze',
      repeatCount: 1,
      ...(draftType === 'animateTransform' ? { transformType: 'rotate' } : {}),
    };
    addAnimation(newAnim);

    // Switch to editing the newly created animation
    const store = useCanvasStore.getState() as unknown as AnimationPluginSlice;
    const newAnims = store.animations ?? [];
    const lastAnim = newAnims[newAnims.length - 1];
    if (lastAnim) {
      updateAnimationManagerState?.({
        selectedAnimationId: lastAnim.id,
        editorMode: 'editing',
      });
    }

    if (autoPlayOnEdit) {
      playAnimations?.();
    }
  }, [
    addAnimation,
    selectedIds,
    draftType,
    draftAttr,
    draftFrom,
    draftTo,
    draftDur,
    autoPlayOnEdit,
    playAnimations,
    updateAnimationManagerState,
  ]);

  const handleCancel = useCallback(() => {
    updateAnimationManagerState?.({
      editorMode: 'idle',
      selectedAnimationId: null,
    });
  }, [updateAnimationManagerState]);

  // ── Attribute options for creation form ─────────────────────────────────

  const animationTypeOptions = useMemo(() => getAnimationTypeOptions(), []);

  const attributeOptions = useMemo(
    () => getAttributeOptionsForType(draftType),
    [draftType],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  if (editorMode === 'idle') {
    return (
      <Panel title="Editor" isCollapsible defaultOpen>
        <Text fontSize="11px" color="gray.500" px={2} py={3} textAlign="center">
          Select an animation to edit, or click + to create one
        </Text>
      </Panel>
    );
  }

  // ── Creating mode ───────────────────────────────────────────────────────

  if (editorMode === 'creating') {
    return (
      <Panel title="New Animation" isCollapsible defaultOpen>
        <VStack spacing={2} align="stretch" px={1}>
          <CustomSelect
            value={draftType}
            onChange={(v) => setDraftType(v as AnimationType)}
            options={animationTypeOptions}
            size="sm"
          />

          {draftType !== 'animateMotion' && (
            <CustomSelect
              value={draftAttr}
              onChange={setDraftAttr}
              options={attributeOptions}
              size="sm"
            />
          )}

          <HStack spacing={2}>
            <Box flex={1}>
              <Text fontSize="10px" color="gray.500" mb={0.5}>
                From
              </Text>
              <PanelTextInput
                value={draftFrom}
                onChange={setDraftFrom}
                width="100%"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="10px" color="gray.500" mb={0.5}>
                To
              </Text>
              <PanelTextInput
                value={draftTo}
                onChange={setDraftTo}
                width="100%"
              />
            </Box>
          </HStack>

          <SliderControl
            label="Duration"
            value={draftDur}
            min={0.1}
            max={20}
            step={0.1}
            onChange={setDraftDur}
            formatter={(v) => `${v.toFixed(1)}s`}
          />

          <HStack spacing={2} pt={1}>
            <PanelStyledButton onClick={handleCreate} size="xs" flex={1}>
              Create
            </PanelStyledButton>
            <PanelStyledButton onClick={handleCancel} size="xs" variant="ghost">
              Cancel
            </PanelStyledButton>
          </HStack>
        </VStack>
      </Panel>
    );
  }

  // ── Editing mode — using shared AnimationCard ───────────────────────────

  if (!selectedAnimation) {
    return (
      <Panel title="Editor" isCollapsible defaultOpen>
        <Text fontSize="11px" color="gray.500" px={2} py={3} textAlign="center">
          Animation not found
        </Text>
      </Panel>
    );
  }

  return (
    <Panel title="Editor" isCollapsible defaultOpen>
      <Box px={1} pb={1}>
        <AnimationCard
          animation={selectedAnimation}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          elements={elements}
        />
      </Box>
    </Panel>
  );
};
