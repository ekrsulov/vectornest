/**
 * BatchActions — Multi-element batch operations for animation choreography.
 * Provides stagger, sequential chain, apply-to-all, and clear-all actions.
 */

import React, { useState } from 'react';
import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { Timer, Link2, Trash2 } from 'lucide-react';
import { Panel } from '../../../ui/Panel';
import { SliderControl } from '../../../ui/SliderControl';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { SectionHeader } from '../../../ui/SectionHeader';
import type { CanvasStore } from '../../../store/canvasStore';
import type { AnimationPluginSlice, SVGAnimation } from '../../animationSystem/types';
import {
  computeStaggerDelays,
  computeSequentialChainDelays,
} from '../utils/staggerCalculator';
import { shallow } from 'zustand/shallow';
import { useFrozenCanvasStoreValueDuringDrag } from '../../../hooks/useFrozenElementsDuringDrag';

const AUTO_BATCH_CHAIN_NAME = 'Batch Actions (Auto)';

interface BatchStoreSlice {
  selectedIds: string[];
  animations: SVGAnimation[];
  animationSync: AnimationPluginSlice['animationSync'];
  setAnimationDelay: AnimationPluginSlice['setAnimationDelay'];
  stopAnimations: AnimationPluginSlice['stopAnimations'];
  createAnimationChain: AnimationPluginSlice['createAnimationChain'];
  removeAnimationChain: AnimationPluginSlice['removeAnimationChain'];
  processAnimationEvents: AnimationPluginSlice['processAnimationEvents'];
  removeAnimation: AnimationPluginSlice['removeAnimation'];
  playAnimations: AnimationPluginSlice['playAnimations'];
}

const selectBatchState = (state: CanvasStore): BatchStoreSlice => {
  const aSlice = state as unknown as AnimationPluginSlice;
  return {
    selectedIds: state.selectedIds,
    animations: aSlice.animations ?? [],
    animationSync: aSlice.animationSync,
    setAnimationDelay: aSlice.setAnimationDelay,
    stopAnimations: aSlice.stopAnimations,
    createAnimationChain: aSlice.createAnimationChain,
    removeAnimationChain: aSlice.removeAnimationChain,
    processAnimationEvents: aSlice.processAnimationEvents,
    removeAnimation: aSlice.removeAnimation,
    playAnimations: aSlice.playAnimations,
  };
};

export const BatchActions: React.FC = () => {
  const {
    selectedIds,
    animations,
    animationSync,
    setAnimationDelay,
    stopAnimations,
    createAnimationChain,
    removeAnimationChain,
    processAnimationEvents,
    removeAnimation,
    playAnimations,
  } = useFrozenCanvasStoreValueDuringDrag(selectBatchState, shallow);

  const [staggerInterval, setStaggerInterval] = useState(0.2);

  // Only show when multiple elements are selected
  if (selectedIds.length < 2) return null;

  // Count animations of selected elements
  const selectedAnimations = animations.filter((a) =>
    selectedIds.includes(a.targetElementId),
  );
  if (selectedAnimations.length === 0) return null;

  const syncBatchChain = (delayMapMs: Map<string, number>) => {
    if (!createAnimationChain || !processAnimationEvents) return;

    // Replace the previous auto-generated batch chain to avoid duplicates.
    const autoChains = (animationSync?.chains ?? []).filter(
      (chain) => chain.name === AUTO_BATCH_CHAIN_NAME,
    );
    for (const chain of autoChains) {
      removeAnimationChain?.(chain.id);
    }

    const entries = Array.from(delayMapMs.entries()).map(([animationId, delayMs]) => ({
      animationId,
      delay: Math.max(0, delayMs) / 1000,
      trigger: 'start' as const,
    }));
    if (entries.length === 0) return;

    createAnimationChain(AUTO_BATCH_CHAIN_NAME, entries);
    processAnimationEvents?.();
  };

  const handleStagger = () => {
    if (!setAnimationDelay) return;

    // Force a clean restart so updated delays are reflected every time.
    stopAnimations?.();

    const delays = computeStaggerDelays(selectedIds, staggerInterval);
    const animationDelaysMs = new Map<string, number>();

    for (const anim of selectedAnimations) {
      const elementDelay = delays.get(anim.targetElementId) ?? 0;
      const delayMs = elementDelay * 1000; // Convert to ms
      animationDelaysMs.set(anim.id, delayMs);
      setAnimationDelay(anim.id, delayMs);
    }

    syncBatchChain(animationDelaysMs);
    playAnimations?.();
  };

  const handleChainSequential = () => {
    if (!setAnimationDelay) return;

    // Force a clean restart so updated delays are reflected every time.
    stopAnimations?.();

    const chainDelays = computeSequentialChainDelays(
      selectedIds,
      selectedAnimations,
    );

    for (const [animId, delay] of chainDelays) {
      setAnimationDelay(animId, delay);
    }

    syncBatchChain(chainDelays);
    playAnimations?.();
  };

  const handleClearAll = () => {
    if (!removeAnimation) return;
    for (const anim of selectedAnimations) {
      removeAnimation(anim.id);
    }
  };

  return (
    <Panel title="Batch Actions" isCollapsible defaultOpen>
      <VStack spacing={2} align="stretch">
        <Text fontSize="10px" color="gray.500">
          {selectedIds.length} elements selected •{' '}
          {selectedAnimations.length} animations
        </Text>

        {/* Stagger */}
        <Box>
          <SectionHeader title="Stagger" />
          <SliderControl
            label="Interval"
            value={staggerInterval}
            min={0.05}
            max={2}
            step={0.05}
            onChange={setStaggerInterval}
            formatter={(v) => `${v.toFixed(2)}s`}
          />
          <PanelStyledButton
            onClick={handleStagger}
            size="xs"
            w="100%"
            mt={1}
          >
            <HStack spacing={1}>
              <Timer size={10} />
              <Text>Apply Stagger</Text>
            </HStack>
          </PanelStyledButton>
        </Box>

        {/* Sequential Chain */}
        <PanelStyledButton
          onClick={handleChainSequential}
          size="xs"
          w="100%"
        >
          <HStack spacing={1}>
            <Link2 size={10} />
            <Text>Chain Sequential</Text>
          </HStack>
        </PanelStyledButton>

        {/* Clear All */}
        <PanelStyledButton
          onClick={handleClearAll}
          size="xs"
          w="100%"
          variant="ghost"
        >
          <HStack spacing={1}>
            <Trash2 size={10} />
            <Text>Clear All Animations</Text>
          </HStack>
        </PanelStyledButton>
      </VStack>
    </Panel>
  );
};
