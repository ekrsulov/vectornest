/**
 * AnimationMap — Zone 1: Discovery view showing all animations
 * affecting the current selection, organized by relationship type.
 */

import React, { useCallback, useMemo } from 'react';
import { Box, VStack, Text, Flex, HStack, Badge, useColorModeValue } from '@chakra-ui/react';
import { Plus, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Panel } from '../../../ui/Panel';
import { PanelActionButton } from '../../../ui/PanelActionButton';
import { PathThumbnail } from '../../../ui/PathThumbnail';
import type { CanvasStore } from '../../../store/canvasStore';
import type { CanvasElement, Command } from '../../../types';
import type { AnimationPluginSlice, SVGAnimation } from '../../animationSystem/types';
import type { AnimationManagerSlice } from '../types';
import type { DiscoveredElementAnimations } from '../types';
import { AnimationRow } from './AnimationRow';
import { MiniTimeline } from './MiniTimeline';
import { useAnimationDiscovery } from '../hooks/useAnimationDiscovery';
import { ensureChainDelays } from '../../animationSystem/chainUtils';
import { getItemThumbnailData, buildNativeShapeThumbnailCommands, getGroupThumbnailCommands } from '../../../utils/selectPanelHelpers';
import { useAnimationGizmoControls } from '../../animationSystem/gizmos/GizmoContext';
import { animationGizmoRegistry } from '../../animationSystem/gizmos/registry/GizmoRegistry';
import { shallow } from 'zustand/shallow';
import { getAnimationMapGroupKey } from '../utils/groupKeys';
import { useFrozenCanvasStoreValueDuringDrag } from '../../../hooks/useFrozenElementsDuringDrag';

const EMPTY_CHAIN_DELAYS = new Map<string, number>();

interface AnimationMapStoreSlice {
  selectedAnimationId: string | null;
  expandedGroups: string[];
  updateAnimationManagerState: AnimationManagerSlice['updateAnimationManagerState'];
  animations: SVGAnimation[];
  removeAnimation: AnimationPluginSlice['removeAnimation'];
  addAnimation: AnimationPluginSlice['addAnimation'];
  selectedIds: string[];
  elements: CanvasElement[];
  selectElements: CanvasStore['selectElements'];
}

const selectMapState = (state: CanvasStore): AnimationMapStoreSlice => {
  const aSlice = state as unknown as AnimationPluginSlice;
  const mSlice = state as unknown as AnimationManagerSlice;
  return {
    selectedAnimationId: mSlice.animationManager?.selectedAnimationId ?? null,
    expandedGroups: mSlice.animationManager?.expandedGroups ?? [],
    updateAnimationManagerState: mSlice.updateAnimationManagerState,
    animations: aSlice.animations ?? [],
    removeAnimation: aSlice.removeAnimation,
    addAnimation: aSlice.addAnimation,
    selectedIds: state.selectedIds,
    elements: state.elements,
    selectElements: state.selectElements,
  };
};

interface MiniTimelineStoreSlice {
  animations: SVGAnimation[];
  calculateChainDelays: AnimationPluginSlice['calculateChainDelays'];
  currentTime: number;
  runtimeChainDelays: AnimationPluginSlice['animationState']['chainDelays'];
  selectedAnimationId: string | null;
  setAnimationTime: AnimationPluginSlice['setAnimationTime'];
  updateAnimation: AnimationPluginSlice['updateAnimation'];
}

const selectMiniTimelineState = (state: CanvasStore): MiniTimelineStoreSlice => {
  const aSlice = state as unknown as AnimationPluginSlice;
  const mSlice = state as unknown as AnimationManagerSlice;
  return {
    animations: aSlice.animations ?? [],
    calculateChainDelays: aSlice.calculateChainDelays,
    currentTime: aSlice.animationState?.currentTime ?? 0,
    runtimeChainDelays: aSlice.animationState?.chainDelays ?? EMPTY_CHAIN_DELAYS,
    selectedAnimationId: mSlice.animationManager?.selectedAnimationId ?? null,
    setAnimationTime: aSlice.setAnimationTime,
    updateAnimation: aSlice.updateAnimation,
  };
};

const MiniTimelineSection: React.FC<{
  discovered: DiscoveredElementAnimations[];
  onSelectAnimation: (id: string) => void;
}> = ({ discovered, onSelectAnimation }) => {
  const {
    animations,
    calculateChainDelays,
    currentTime,
    runtimeChainDelays,
    selectedAnimationId,
    setAnimationTime,
    updateAnimation,
  } = useFrozenCanvasStoreValueDuringDrag(selectMiniTimelineState, shallow);

  const chainDelays = useMemo(() => {
    const runtimeDelays = ensureChainDelays(runtimeChainDelays);
    const computedDelays = calculateChainDelays
      ? calculateChainDelays()
      : new Map<string, number>();
    return new Map<string, number>([
      ...computedDelays,
      ...runtimeDelays,
    ]);
  }, [runtimeChainDelays, calculateChainDelays]);

  const allDiscoveredAnimations = useMemo(() => {
    const result: SVGAnimation[] = [];
    for (const el of discovered) {
      for (const group of el.groups) {
        for (const anim of group.animations) {
          if (!result.some((a) => a.id === anim.id)) {
            result.push(anim);
          }
        }
      }
    }
    return result;
  }, [discovered]);

  const handleScrub = useCallback(
    (time: number) => {
      setAnimationTime?.(time);
    },
    [setAnimationTime],
  );

  if (allDiscoveredAnimations.length === 0) {
    return null;
  }

  return (
    <Box mt={1}>
      <MiniTimeline
        animations={allDiscoveredAnimations}
        currentTime={currentTime}
        selectedAnimationId={selectedAnimationId}
        onSelectAnimation={(id) => {
          onSelectAnimation(id);
          const anim = animations.find((item) => item.id === id);
          if (anim && anim.calcMode !== 'spline' && !anim.keySplines) {
            updateAnimation?.(id, {
              calcMode: 'spline',
              keySplines: '0.250 0.100 0.250 1.000',
            });
          }
        }}
        onScrub={handleScrub}
        chainDelays={chainDelays}
      />
    </Box>
  );
};

export const AnimationMap: React.FC = () => {
  const {
    selectedAnimationId,
    expandedGroups,
    updateAnimationManagerState,
    animations,
    removeAnimation,
    addAnimation,
    selectedIds,
    elements,
    selectElements,
  } = useFrozenCanvasStoreValueDuringDrag(selectMapState, shallow);
  const {
    activeGizmos,
    gizmoEditMode,
    activateGizmo,
    deactivateGizmo,
    deactivateAllGizmos,
    setGizmoEditMode,
  } = useAnimationGizmoControls();

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    for (const element of elements) {
      map.set(element.id, element);
    }
    return map;
  }, [elements]);

  const hasGizmoForAnimation = useCallback(
    (animation: SVGAnimation): boolean => {
      const targetElement = elementMap.get(animation.targetElementId);
      if (!targetElement) return false;

      const gizmos = animationGizmoRegistry.getAll();
      return gizmos.some((gizmo) => {
        try {
          return gizmo.canHandle?.(animation) || gizmo.appliesTo?.(animation, targetElement);
        } catch {
          return false;
        }
      });
    },
    [elementMap]
  );

  const activeGizmoAnimationId = useMemo(() => {
    if (!gizmoEditMode || activeGizmos.size === 0) {
      return null;
    }
    return Array.from(activeGizmos.keys())[0] ?? null;
  }, [activeGizmos, gizmoEditMode]);

  const discovered = useAnimationDiscovery();

  const handleSelectAnimation = useCallback(
    (id: string) => {
      updateAnimationManagerState?.({
        selectedAnimationId: id,
        editorMode: 'editing',
      });
    },
    [updateAnimationManagerState],
  );

  const handleDeleteAnimation = useCallback(
    (id: string) => {
      if (activeGizmos.has(id)) {
        deactivateGizmo(id);
        if (activeGizmos.size <= 1) {
          setGizmoEditMode(false);
        }
      }
      removeAnimation?.(id);
      if (selectedAnimationId === id) {
        updateAnimationManagerState?.({
          selectedAnimationId: null,
          editorMode: 'idle',
        });
      }
    },
    [
      activeGizmos,
      deactivateGizmo,
      removeAnimation,
      selectedAnimationId,
      setGizmoEditMode,
      updateAnimationManagerState,
    ],
  );

  const handleDuplicateAnimation = useCallback(
    (id: string) => {
      const anim = animations.find((a) => a.id === id);
      if (!anim || !addAnimation) return;
      const { id: _id, ...rest } = anim;
      addAnimation(rest);
    },
    [animations, addAnimation],
  );

  const handleToggleGroup = useCallback(
    (key: string) => {
      const next = expandedGroups.includes(key)
        ? expandedGroups.filter((k) => k !== key)
        : [...expandedGroups, key];
      updateAnimationManagerState?.({ expandedGroups: next });
    },
    [expandedGroups, updateAnimationManagerState],
  );

  const handleAddAnimation = useCallback(() => {
    updateAnimationManagerState?.({
      editorMode: 'creating',
      selectedAnimationId: null,
    });
  }, [updateAnimationManagerState]);

  const handleToggleGizmo = useCallback(
    (animationId: string) => {
      const animation = animations.find((a) => a.id === animationId);
      if (!animation || !hasGizmoForAnimation(animation)) return;

      const targetElement = elementMap.get(animation.targetElementId);
      if (!targetElement) return;

      const isCurrentlyActive = gizmoEditMode && activeGizmos.has(animationId);

      if (isCurrentlyActive) {
        deactivateGizmo(animationId);
        if (activeGizmos.size <= 1) {
          setGizmoEditMode(false);
        }
        return;
      }

      // Gizmo overlay requires a single selected target element to stay active.
      if (selectedIds.length !== 1 || selectedIds[0] !== targetElement.id) {
        selectElements?.([targetElement.id]);
      }

      deactivateAllGizmos();
      activateGizmo(animationId);
      setGizmoEditMode(true);
      updateAnimationManagerState?.({
        selectedAnimationId: animationId,
        editorMode: 'editing',
      });
    },
    [
      activateGizmo,
      activeGizmos,
      animations,
      deactivateAllGizmos,
      deactivateGizmo,
      elementMap,
      gizmoEditMode,
      hasGizmoForAnimation,
      selectedIds,
      selectElements,
      setGizmoEditMode,
      updateAnimationManagerState,
    ],
  );

  const totalAnimCount = discovered.reduce((sum, el) => sum + el.totalCount, 0);
  const multiElement = discovered.length > 1;
  const allExpandableGroupKeys = discovered.flatMap((elementAnims) =>
    elementAnims.groups.map((group) => getAnimationMapGroupKey(elementAnims.elementId, group))
  );
  const areAllAnimatedElementsExpanded = allExpandableGroupKeys.length > 0 && allExpandableGroupKeys.every(
    (key) => expandedGroups.includes(key)
  );
  const canExpandAllAnimatedElements = allExpandableGroupKeys.some(
    (key) => !expandedGroups.includes(key)
  );

  const handleToggleAllAnimatedElements = useCallback(() => {
    if (allExpandableGroupKeys.length === 0) return;
    if (areAllAnimatedElementsExpanded) {
      updateAnimationManagerState?.({
        expandedGroups: expandedGroups.filter((key) => !allExpandableGroupKeys.includes(key)),
      });
      return;
    }

    updateAnimationManagerState?.({
      expandedGroups: Array.from(new Set([...expandedGroups, ...allExpandableGroupKeys])),
    });
  }, [
    allExpandableGroupKeys,
    areAllAnimatedElementsExpanded,
    expandedGroups,
    updateAnimationManagerState,
  ]);

  if (selectedIds.length === 0) {
    return (
      <Panel
        title="Animation Map"
        isCollapsible
        defaultOpen
        disableExpandedFrame
      >
        <Text fontSize="11px" color="gray.500" px={2} py={3} textAlign="center">
          Select elements to see their animations
        </Text>
      </Panel>
    );
  }

  return (
    <Panel
      title="Animation Map"
      isCollapsible
      defaultOpen
      disableExpandedFrame
      headerActions={
        <HStack spacing={2}>
          {totalAnimCount > 0 && (
            <Badge
              variant="subtle"
              colorScheme="blue"
              fontSize="2xs"
              px={1.5}
              py={0.5}
              borderRadius="sm"
            >
              {totalAnimCount}
            </Badge>
          )}
          {multiElement && allExpandableGroupKeys.length > 0 && (
            <PanelActionButton
              label={areAllAnimatedElementsExpanded ? 'Collapse all animated elements' : 'Expand all animated elements'}
              icon={areAllAnimatedElementsExpanded ? ChevronsUp : ChevronsDown}
              onClick={handleToggleAllAnimatedElements}
              iconSize={10}
              isDisabled={!areAllAnimatedElementsExpanded && !canExpandAllAnimatedElements}
            />
          )}
          <PanelActionButton
            icon={Plus}
            iconSize={12}
            label="Add Animation"
            onClick={handleAddAnimation}
          />
        </HStack>
      }
    >
      <VStack spacing={1} align="stretch">
        {discovered.length === 0 && (
          <Text fontSize="11px" color="gray.500" px={2} py={2} textAlign="center">
            No animations found for selection
          </Text>
        )}

        {discovered.map((elementAnims) => (
          <ElementAnimationSection
            key={elementAnims.elementId}
            elementAnims={elementAnims}
            multiElement={multiElement}
            expandedGroups={expandedGroups}
            selectedAnimationId={selectedAnimationId}
            activeGizmoAnimationId={activeGizmoAnimationId}
            onSelectAnimation={handleSelectAnimation}
            onDeleteAnimation={handleDeleteAnimation}
            onDuplicateAnimation={handleDuplicateAnimation}
            onToggleGizmo={handleToggleGizmo}
            canUseGizmo={hasGizmoForAnimation}
            onToggleGroup={handleToggleGroup}
            elements={elements}
          />
        ))}

        <MiniTimelineSection
          discovered={discovered}
          onSelectAnimation={handleSelectAnimation}
        />
      </VStack>
    </Panel>
  );
};

// ─── Per-Element Section ─────────────────────────────────────────────────────

interface ElementAnimationSectionProps {
  elementAnims: DiscoveredElementAnimations;
  multiElement: boolean;
  expandedGroups: string[];
  selectedAnimationId: string | null;
  activeGizmoAnimationId: string | null;
  onSelectAnimation: (id: string) => void;
  onDeleteAnimation: (id: string) => void;
  onDuplicateAnimation: (id: string) => void;
  onToggleGizmo: (id: string) => void;
  canUseGizmo: (animation: SVGAnimation) => boolean;
  onToggleGroup: (key: string) => void;
  elements: CanvasElement[];
}

/** Compute thumbnail commands for any element type */
function getElementThumbnailCommands(element: CanvasElement, elements: CanvasElement[]): Command[] {
  if (element.type === 'path') {
    return getItemThumbnailData('element', element.data).commands;
  }
  if (element.type === 'group') {
    const groupEl = element as CanvasElement & { childIds?: string[] };
    return getGroupThumbnailCommands(groupEl.childIds, elements);
  }
  if (element.type === 'nativeShape') {
    const nativeEl = element as CanvasElement & { data: { kind: string } };
    return buildNativeShapeThumbnailCommands(nativeEl.data as Parameters<typeof buildNativeShapeThumbnailCommands>[0]);
  }
  return [];
}

const ElementAnimationSection: React.FC<ElementAnimationSectionProps> = ({
  elementAnims,
  multiElement,
  expandedGroups,
  selectedAnimationId,
  activeGizmoAnimationId,
  onSelectAnimation,
  onDeleteAnimation,
  onDuplicateAnimation,
  onToggleGizmo,
  canUseGizmo,
  onToggleGroup,
  elements,
}) => {
  const sectionBg = useColorModeValue('gray.100', 'whiteAlpha.50');
  const sectionHoverBg = useColorModeValue('gray.100', 'whiteAlpha.50');
  const thumbnailCommands = useMemo(() => {
    if (!multiElement) return [];
    const element = elements.find((el) => el.id === elementAnims.elementId);
    if (!element) return [];
    return getElementThumbnailCommands(element, elements);
  }, [multiElement, elements, elementAnims.elementId]);
  return (
    <Box>
      {/* Element header (only for multi-element) */}
      {multiElement && (
        <Flex
          align="center"
          gap={1}
          px={2}
          py={1}
          bg={sectionBg}
          borderRadius="sm"
          mb={1}
        >
          {thumbnailCommands.length > 0 && (
            <Box w="18px" h="18px" flexShrink={0}>
              <PathThumbnail commands={thumbnailCommands} />
            </Box>
          )}
          <Text fontSize="10px" fontWeight="bold" isTruncated>
            {elementAnims.elementName}
          </Text>
          <Badge
            variant="subtle"
            colorScheme="blue"
            fontSize="2xs"
            px={1.5}
            py={0.5}
            borderRadius="sm"
            flexShrink={0}
            ml="auto"
          >
            {elementAnims.totalCount}
          </Badge>
        </Flex>
      )}

      {/* Animation groups */}
      {elementAnims.groups.map((group) => {
        const key = getAnimationMapGroupKey(elementAnims.elementId, group);
        const isExpanded = expandedGroups.includes(key) || !multiElement;

        return (
          <Box key={key} mb={1}>
            {/* Group header */}
            <Flex
              align="center"
              gap={1}
              px={2}
              py={0.5}
              cursor={multiElement ? 'pointer' : 'default'}
              onClick={multiElement ? () => onToggleGroup(key) : undefined}
              _hover={multiElement ? { bg: sectionHoverBg } : {}}
              borderRadius="sm"
            >
              {multiElement && (
                <Box flexShrink={0}>
                  {isExpanded ? (
                    <ChevronDown size={10} />
                  ) : (
                    <ChevronRight size={10} />
                  )}
                </Box>
              )}
              <Text
                fontSize="9px"
                fontWeight="semibold"
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                {group.groupLabel}
              </Text>
              <Text fontSize="9px" color="gray.500">
                ({group.animations.length})
              </Text>
            </Flex>

            {/* Animation rows */}
            {isExpanded && (
              <VStack spacing={0} align="stretch" pl={multiElement ? 3 : 0}>
                {group.animations.map((anim) => (
                  <AnimationRow
                    key={anim.id}
                    animation={anim}
                    isSelected={anim.id === selectedAnimationId}
                    isGizmoActive={anim.id === activeGizmoAnimationId}
                    onSelect={onSelectAnimation}
                    onDelete={onDeleteAnimation}
                    onDuplicate={onDuplicateAnimation}
                    onActivateGizmo={canUseGizmo(anim) ? onToggleGizmo : undefined}
                  />
                ))}
              </VStack>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
