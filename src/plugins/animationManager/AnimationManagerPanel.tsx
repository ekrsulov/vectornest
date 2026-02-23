/**
 * AnimationManagerPanel — Main container assembling the 3-zone layout.
 *
 * Zone 1: Animation Map (discovery view)
 * Zone 2: Animation Editor (property editor)
 * Zone 3: Preset Catalog (preset browser)
 *
 * Also includes playback mini-controls in the header and batch actions
 * when multiple elements are selected.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Panel } from '../../ui/Panel';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';

import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import type { AnimationManagerSlice } from './types';
import { GizmoToolbarCompact } from '../animationSystem/gizmos/ui/GizmoToolbar';

import { AnimationMap } from './components/AnimationMap';
import { AnimationEditor } from './components/AnimationEditor';
import { PresetCatalog } from './components/PresetCatalog';
import { BatchActions } from './components/BatchActions';

/* ------------------------------------------------------------------ */
/*  Store selector                                                     */
/* ------------------------------------------------------------------ */

interface PanelStoreSlice {
  selectedIds: string[];
  selectedAnimationId: string | null;
  animations: SVGAnimation[];
  // Playback
  isPlaying: boolean;
  currentTime: number;
  // Animation manager state
  autoPlayOnEdit: boolean;
  defaultDuration: number;
  editorMode: 'idle' | 'editing' | 'creating';
  // Animation system actions
  playAnimations: AnimationPluginSlice['playAnimations'];
  pauseAnimations: AnimationPluginSlice['pauseAnimations'];
  stopAnimations: AnimationPluginSlice['stopAnimations'];
  setAnimationTime: AnimationPluginSlice['setAnimationTime'];
  // Manager actions
  updateAnimationManagerState: AnimationManagerSlice['updateAnimationManagerState'];
}

const selectPanelState = (state: CanvasStore): PanelStoreSlice => {
  const aSlice = state as unknown as AnimationPluginSlice;
  const mSlice = state as unknown as AnimationManagerSlice;
  const mgr = mSlice.animationManager;
  return {
    selectedIds: state.selectedIds,
    selectedAnimationId: mgr?.selectedAnimationId ?? null,
    animations: aSlice.animations ?? [],
    isPlaying: aSlice.animationState?.isPlaying ?? false,
    currentTime: aSlice.animationState?.currentTime ?? 0,
    autoPlayOnEdit: mgr?.autoPlayOnEdit ?? false,
    defaultDuration: mgr?.defaultDuration ?? 1.5,
    editorMode: mgr?.editorMode ?? 'idle',
    playAnimations: aSlice.playAnimations,
    pauseAnimations: aSlice.pauseAnimations,
    stopAnimations: aSlice.stopAnimations,
    setAnimationTime: aSlice.setAnimationTime,
    updateAnimationManagerState: mSlice.updateAnimationManagerState,
  };
};

/* ------------------------------------------------------------------ */
/*  Settings Popover (inline toggle section)                           */
/* ------------------------------------------------------------------ */

const SettingsSection: React.FC<{
  autoPlayOnEdit: boolean;
  defaultDuration: number;
  updateState: AnimationManagerSlice['updateAnimationManagerState'];
}> = ({ autoPlayOnEdit, defaultDuration, updateState }) => {
  return (
    <VStack spacing={1} align="stretch" px={1} py={1}>
      <HStack justify="space-between">
        <Text fontSize="10px" color="gray.500">
          Auto-play on edit
        </Text>
        <PanelSwitch
          isChecked={autoPlayOnEdit}
          onChange={(e) =>
            updateState?.({ autoPlayOnEdit: e.target.checked })
          }
          aria-label="Toggle auto-play on edit"
        />
      </HStack>
      <SliderControl
        label="Default Duration"
        value={defaultDuration}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(val) => updateState?.({ defaultDuration: val })}
        formatter={(v) => `${v.toFixed(1)}s`}
      />
    </VStack>
  );
};

/* ------------------------------------------------------------------ */
/*  Playback Mini-Controls                                             */
/* ------------------------------------------------------------------ */

const PlaybackControls: React.FC<{
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSkip: (delta: number) => void;
}> = ({ isPlaying, onPlayPause, onStop, onSkip }) => {
  return (
    <HStack spacing={0}>
      <PanelActionButton
        label="Skip back"
        icon={SkipBack}
        onClick={() => onSkip(-0.5)}
        iconSize={10}
      />
      <PanelActionButton
        label={isPlaying ? 'Pause' : 'Play'}
        icon={isPlaying ? Pause : Play}
        onClick={onPlayPause}
        iconSize={10}
      />
      <PanelActionButton
        label="Stop"
        icon={Square}
        onClick={onStop}
        iconSize={10}
      />
      <PanelActionButton
        label="Skip forward"
        icon={SkipForward}
        onClick={() => onSkip(0.5)}
        iconSize={10}
      />
    </HStack>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export const AnimationManagerPanel: React.FC = () => {
  const {
    selectedIds,
    selectedAnimationId,
    animations,
    isPlaying,
    currentTime,
    autoPlayOnEdit,
    defaultDuration,
    playAnimations,
    pauseAnimations,
    stopAnimations,
    setAnimationTime,
    updateAnimationManagerState,
  } = useCanvasStore(useShallow(selectPanelState));

  // Clear editor when canvas selection changes
  const prevSelectedIdsRef = useRef(selectedIds);
  useEffect(() => {
    const prev = prevSelectedIdsRef.current;
    prevSelectedIdsRef.current = selectedIds;
    // Only reset if the selection actually changed (different set of IDs)
    if (
      prev.length !== selectedIds.length ||
      prev.some((id, i) => id !== selectedIds[i])
    ) {
      // Keep current editor selection if it still belongs to the new canvas selection.
      const selectedAnimation = selectedAnimationId
        ? animations.find((anim) => anim.id === selectedAnimationId)
        : null;
      if (selectedAnimation && selectedIds.includes(selectedAnimation.targetElementId)) {
        return;
      }

      updateAnimationManagerState?.({
        selectedAnimationId: null,
        editorMode: 'idle',
      });
    }
  }, [selectedIds, selectedAnimationId, animations, updateAnimationManagerState]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseAnimations?.();
    } else {
      playAnimations?.();
    }
  }, [isPlaying, pauseAnimations, playAnimations]);

  const handleStop = useCallback(() => {
    stopAnimations?.();
  }, [stopAnimations]);

  const handleSkip = useCallback(
    (delta: number) => {
      if (!setAnimationTime) return;
      const next = Math.max(0, currentTime + delta);
      setAnimationTime(next);
    },
    [currentTime, setAnimationTime],
  );

  // Empty state when nothing selected
  if (selectedIds.length === 0) {
    return (
      <Panel title="Animation Manager" isCollapsible defaultOpen>
        <Box px={2} py={4} textAlign="center">
          <Text fontSize="11px" color="gray.500">
            Select one or more elements to manage their animations.
          </Text>
        </Box>
      </Panel>
    );
  }

  return (
    <VStack spacing={0} align="stretch">
      {/* Header panel with playback + settings */}
      <Panel
        title="Animation Manager"
        isCollapsible
        defaultOpen
        headerActions={
          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onSkip={handleSkip}
          />
        }
      >
        <SettingsSection
          autoPlayOnEdit={autoPlayOnEdit}
          defaultDuration={defaultDuration}
          updateState={updateAnimationManagerState}
        />
        <Box px={1} pb={1}>
          <GizmoToolbarCompact />
        </Box>
      </Panel>

      {/* Zone 1: Animation Map */}
      <AnimationMap />

      {/* Zone 2: Animation Editor */}
      <AnimationEditor />

      {/* Zone 3: Preset Catalog */}
      <PresetCatalog />

      {/* Batch Actions (only for multi-selection) */}
      <BatchActions />
    </VStack>
  );
};
