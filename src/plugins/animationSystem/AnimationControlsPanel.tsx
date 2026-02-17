import React, { useCallback, useState } from 'react';
import { VStack, HStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { SliderControl } from '../../ui/SliderControl';
import { Play, Pause, Square, SkipBack, SkipForward, Trash2, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { GizmoToolbarCompact } from './gizmos/ui/GizmoToolbar';
import type { AnimationPluginSlice, SVGAnimation } from './types';
import { ensureChainDelays } from './chainUtils';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';

const computeTotalDurationSeconds = (anim?: SVGAnimation): number => {
  if (!anim) return 0;
  const durSec = parseFloat(String(anim.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = anim.repeatDur ? parseFloat(String(anim.repeatDur).replace('s', '')) : null;
  const repeat = anim.repeatCount === 'indefinite'
    ? Infinity
    : typeof anim.repeatCount === 'number'
      ? anim.repeatCount
      : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  if (repeat === Infinity) return Infinity;
  return durSec * repeat;
};

const collectUsedClipAndMaskIds = (state: CanvasStore): { clipIds: Set<string>; maskIds: Set<string> } => {
  const clipIds = new Set<string>();
  const maskIds = new Set<string>();

  for (const element of state.elements) {
    const data = element.data as Record<string, unknown>;
    const clipId = (data.clipPathTemplateId as string | undefined) ?? (data.clipPathId as string | undefined);
    if (clipId) clipIds.add(clipId);

    const maskId = data.maskId as string | undefined;
    if (maskId) maskIds.add(maskId);
  }

  return { clipIds, maskIds };
};

const selectAnimationControlsPanelState = (state: CanvasStore) => {
  const slice = state as unknown as AnimationPluginSlice;
  const selectedId = state.selectedIds[0] ?? null;
  const animations = slice.animations ?? [];
  const animationState = slice.animationState;
  const { clipIds: usedClipIds, maskIds: usedMaskIds } = collectUsedClipAndMaskIds(state);

  const playbackAnimations = animations.filter((anim) => {
    if (anim.clipPathTargetId) {
      return usedClipIds.has(anim.clipPathTargetId);
    }
    if (anim.maskTargetId) {
      return usedMaskIds.has(anim.maskTargetId);
    }
    return true;
  });

  const currentTime = animationState?.currentTime ?? 0;
  const isPlaying = animationState?.isPlaying ?? false;
  const animationsCount = playbackAnimations.length;

  let selectedElementAnimationsCount = 0;
  if (selectedId) {
    for (const anim of playbackAnimations) {
      if (anim.targetElementId === selectedId) {
        selectedElementAnimationsCount += 1;
      }
    }
  }

  const chainDelays: Map<string, number> = (() => {
    const normalized = ensureChainDelays(animationState?.chainDelays);
    if (normalized.size > 0) return normalized;
    return slice.calculateChainDelays ? slice.calculateChainDelays() : new Map<string, number>();
  })();

  const maxDuration = (() => {
    if (animationsCount === 0) {
      return Math.max(2, currentTime);
    }

    let hasInfinity = false;
    let maxFiniteDuration = 0;

    for (const anim of playbackAnimations) {
      const delayMs = chainDelays.get(anim.id) ?? 0;
      const total = computeTotalDurationSeconds(anim) + delayMs / 1000;
      if (!Number.isFinite(total)) {
        hasInfinity = true;
        continue;
      }
      if (total > maxFiniteDuration) {
        maxFiniteDuration = total;
      }
    }

    const baseMax = Math.max(maxFiniteDuration, currentTime);
    return hasInfinity ? Math.max(10, baseMax) : Math.max(2, baseMax);
  })();

  return {
    selectedId,
    animationsCount,
    selectedElementAnimationsCount,
    currentTime,
    isPlaying,
    maxDuration,

    playAnimations: slice.playAnimations,
    pauseAnimations: slice.pauseAnimations,
    stopAnimations: slice.stopAnimations,
    setAnimationTime: slice.setAnimationTime,
    setAnimationWorkspaceOpen: slice.setAnimationWorkspaceOpen,
  };
};

export const AnimationControlsPanel: React.FC = () => {
  const {
    selectedId,
    animationsCount,
    selectedElementAnimationsCount,
    currentTime,
    isPlaying,
    maxDuration,
    playAnimations,
    pauseAnimations,
    stopAnimations,
    setAnimationTime,
    setAnimationWorkspaceOpen,
  } = useShallowCanvasSelector(selectAnimationControlsPanelState);

  // Gizmo panel starts collapsed when gizmos exist
  const [showGizmos, setShowGizmos] = useState(false);

  const hasGizmos = selectedId && selectedElementAnimationsCount > 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAnimations?.();
    } else {
      playAnimations?.();
    }
  };

  const handleSkip = (delta: number) => {
    if (!setAnimationTime) return;
    const next = Math.min(maxDuration, Math.max(0, currentTime + delta));
    setAnimationTime(next);
  };

  const handleScrub = (value: number) => {
    setAnimationTime?.(value);
  };

  const handleOpenWorkspace = () => {
    setAnimationWorkspaceOpen?.(true);
  };

  const handleClearSelectedElementAnimations = useCallback(() => {
    const store = useCanvasStore.getState() as CanvasStore & AnimationPluginSlice;
    const currentSelectedId = store.selectedIds[0];
    const animations = store.animations ?? [];
    const removeAnimation = store.removeAnimation;
    if (!currentSelectedId || !removeAnimation) return;

    animations.forEach((anim) => {
      if (anim.targetElementId === currentSelectedId) {
        removeAnimation(anim.id);
      }
    });
  }, []);

  return (
    <Panel
      title="Animations"
      isCollapsible={false}
      headerActions={
        <HStack spacing={1}>
          <PanelActionButton
            icon={Layers}
            iconSize={14}
            label="Workspace"
            onClick={handleOpenWorkspace}
          />
          {selectedId && (
            <>
              {selectedElementAnimationsCount > 0 && (
                <PanelActionButton
                  icon={Trash2}
                  iconSize={14}
                  label="Clear"
                  onClick={handleClearSelectedElementAnimations}
                />
              )}
              {hasGizmos && (
                <PanelActionButton
                  icon={showGizmos ? ChevronDown : ChevronRight}
                  iconSize={14}
                  label="Gizmos"
                  onClick={() => setShowGizmos((v) => !v)}
                />
              )}
            </>
          )}
        </HStack>
      }
    >
      <VStack spacing={1} align="stretch">
        {/* Compact Timeline - only show when animations exist */}
        {animationsCount > 0 && (
          <HStack spacing={1} align="center">
            <PanelActionButton icon={SkipBack} iconSize={12} label="-0.5s" onClick={() => handleSkip(-0.5)} />
            <PanelActionButton
              icon={isPlaying ? Pause : Play}
              iconSize={12}
              label={isPlaying ? 'Pause' : 'Play'}
              onClick={handlePlayPause}
            />
            <PanelActionButton icon={SkipForward} iconSize={12} label="+0.5s" onClick={() => handleSkip(0.5)} />
            <PanelActionButton
              icon={Square}
              iconSize={12}
              label="Stop"
              onClick={() => stopAnimations?.()}
            />
            <SliderControl
              value={currentTime}
              min={0}
              max={maxDuration}
              step={0.05}
              onChange={handleScrub}
              formatter={(v) => `${v.toFixed(2)}s`}
              valueWidth="55px"
              marginBottom="0"
              inline={true}
              gap="4px"
            />
          </HStack>
        )}

        {/* Gizmo Toolbar - shown when user expands via chevron */}
        {hasGizmos && showGizmos && (
          <GizmoToolbarCompact />
        )}
      </VStack>
    </Panel>
  );
};
