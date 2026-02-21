import React, { useMemo, useRef, useCallback, useState } from 'react';
import { VStack, HStack, Text, Box, useColorModeValue } from '@chakra-ui/react';
import { PanelActionButton } from '../../../ui/PanelActionButton';
import { SliderControl } from '../../../ui/SliderControl';
import { Play, Pause, SkipBack, SkipForward, Square, MoreVertical, Trash2, Edit, Plus } from 'lucide-react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import type { AnimationPluginSlice, SVGAnimation } from '../types';
import { useCanvasStore } from '../../../store/canvasStore';
import { ensureChainDelays } from '../chainUtils';
import { elementContributionRegistry } from '../../../utils/elementContributionRegistry';
import type { CanvasElement, PathData } from '../../../types';
import { PathThumbnail } from '../../../ui/PathThumbnail';
import { getGroupThumbnailCommands, getItemThumbnailData } from '../../../utils/selectPanelHelpers';
import type { FilterSlice } from '../../filter/slice';
import type { MasksSlice } from '../../masks/types';
import type { MarkersSlice } from '../../markers/slice';
import type { GradientsSlice } from '../../gradients/slice';

const TRACK_HEIGHT = 32;
const TIME_SCALE_HEIGHT = 24;
const PIXELS_PER_SECOND = 80;
const HANDLE_WIDTH = 8;

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

interface DragState {
  animId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  originalStart: number;
  originalDuration: number;
}

interface TimelineTabProps {
  onEditAnimation?: (anim: SVGAnimation) => void;
  onAddNew?: () => void;
  onPreviewAnimation?: (anim: SVGAnimation) => void;
}

interface ResolvedTarget {
  element?: CanvasElement;
  type: 'direct' | 'filter' | 'gradient' | 'mask' | 'marker' | 'unknown';
  label?: string;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ onEditAnimation, onAddNew, onPreviewAnimation }) => {
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const animationState = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animationState);
  const setAnimationTime = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).setAnimationTime);
  const playAnimations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).playAnimations);
  const pauseAnimations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).pauseAnimations);
  const stopAnimations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).stopAnimations);
  const removeAnimation = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).removeAnimation);
  const calculateChainDelays = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).calculateChainDelays);
  const updateAnimation = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).updateAnimation);
  const setAnimationDelay = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).setAnimationDelay);
  const timelineLabelWidth = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).timelineLabelWidth ?? 170);
  const setTimelineLabelWidth = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).setTimelineLabelWidth);
  const elements = useCanvasStore((state) => state.elements);
  const filters = useCanvasStore((state) => (state as unknown as FilterSlice).filters);
  const importedFilters = useCanvasStore((state) => (state as unknown as FilterSlice).importedFilters);
  const gradients = useCanvasStore((state) => (state as unknown as GradientsSlice).gradients);
  const masks = useCanvasStore((state) => (state as unknown as MasksSlice).masks ?? []);
  const markers = useCanvasStore((state) => (state as unknown as MarkersSlice).markers ?? []);

  const [isDraggingWidth, setIsDraggingWidth] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(170);

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  const resolveTarget = useCallback((targetId: string): ResolvedTarget => {
    // 1. Check direct element
    const element = elementMap.get(targetId);
    if (element) return { element, type: 'direct' };

    // 2. Check filters
    const filterDef = filters?.[targetId] || importedFilters?.find(f => f.id === targetId);
    if (filterDef) {
      // Find element using this filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usingElement = elements.find(el => (el.data as any).filterId === targetId);
      return {
        element: usingElement,
        type: 'filter',
        label: filterDef.type === 'custom' ? 'Filter' : filterDef.type
      };
    }

    // 3. Check gradients
    const gradientDef = gradients?.find(g => g.id === targetId);
    if (gradientDef) {
      const usingElement = elements.find(el => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = el.data as any;
        return data.fillColor?.includes(targetId) || data.strokeColor?.includes(targetId);
      });
      return {
        element: usingElement,
        type: 'gradient',
        label: 'Gradient'
      };
    }

    // 4. Masks
    const maskDef = masks.find((m) => m.id === targetId);
    if (maskDef) {
      const usingElement = elements.find(el => (el.data as Record<string, unknown> | undefined)?.maskId === targetId);
      return {
        element: usingElement,
        type: 'mask',
        label: maskDef.id,
      };
    }

    // 5. Markers
    const markerDef = markers.find((m) => m.id === targetId);
    if (markerDef) {
      const usingElement = elements.find(el => {
        const data = el.data as Record<string, unknown> | undefined;
        return data?.markerStart === targetId || data?.markerMid === targetId || data?.markerEnd === targetId;
      });
      return {
        element: usingElement,
        type: 'marker',
        label: markerDef.id,
      };
    }

    return { type: 'unknown' };
  }, [elementMap, elements, filters, importedFilters, gradients, masks, markers]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredAnim, setHoveredAnim] = useState<string | null>(null);

  // Colors
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const gridColor = useColorModeValue('gray.200', 'gray.600');
  const trackBg = useColorModeValue('gray.100', 'gray.700');
  const barColor = useColorModeValue('gray.500', 'gray.400');
  const barHoverColor = useColorModeValue('gray.600', 'gray.300');
  const handleColor = useColorModeValue('gray.700', 'gray.200');
  const playheadColor = useColorModeValue('red.500', 'red.400');

  const chainDelays: Map<string, number> = useMemo(() => {
    const normalized = ensureChainDelays(animationState?.chainDelays);
    if (normalized.size > 0) return normalized;
    return calculateChainDelays ? calculateChainDelays() : new Map<string, number>();
  }, [animationState?.chainDelays, calculateChainDelays]);

  const sortedAnimations = useMemo(() => {
    return [...animations].sort((a, b) => {
      const delayA = chainDelays.get(a.id) ?? 0;
      const delayB = chainDelays.get(b.id) ?? 0;
      return delayA - delayB;
    });
  }, [animations, chainDelays]);

  const maxDuration = useMemo(() => {
    const durations = animations.map((anim) => {
      const delayMs = chainDelays.get(anim.id) ?? 0;
      return computeTotalDurationSeconds(anim) + delayMs / 1000;
    });
    const hasInfinity = durations.some((dur) => !Number.isFinite(dur));
    const finiteDurations = durations.filter((dur) => Number.isFinite(dur)) as number[];
    const baseMax = finiteDurations.length
      ? Math.max(...finiteDurations, animationState?.currentTime ?? 0)
      : animationState?.currentTime ?? 0;
    return hasInfinity ? Math.max(10, baseMax) : Math.max(2, baseMax);
  }, [animations, animationState?.currentTime, chainDelays]);

  // Add padding for timeline width
  const timelineWidth = Math.max(maxDuration + 2, 5) * PIXELS_PER_SECOND;

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = maxDuration > 10 ? 2 : maxDuration > 5 ? 1 : 0.5;
    for (let t = 0; t <= maxDuration + 2; t += step) {
      markers.push(t);
    }
    return markers;
  }, [maxDuration]);

  // Playhead position in pixels (relative to timeline content, not labels)
  const playheadX = (animationState?.currentTime ?? 0) * PIXELS_PER_SECOND;

  const handleSkip = (delta: number) => {
    if (!setAnimationTime) return;
    const next = Math.min(maxDuration, Math.max(0, (animationState?.currentTime ?? 0) + delta));
    setAnimationTime(next);
  };

  const handleScrub = (value: number) => {
    setAnimationTime?.(value);
  };

  const handlePlayPause = () => {
    if (animationState?.isPlaying) {
      pauseAnimations?.();
    } else {
      playAnimations?.();
    }
  };

  const getAnimationPosition = useCallback((anim: SVGAnimation) => {
    const delaySec = (chainDelays.get(anim.id) ?? 0) / 1000;
    const duration = computeTotalDurationSeconds(anim);
    const effectiveDuration = Number.isFinite(duration) ? duration : maxDuration;
    return {
      start: delaySec,
      duration: effectiveDuration,
      isInfinite: !Number.isFinite(duration),
    };
  }, [chainDelays, maxDuration]);

  // Pointer event handlers for drag/drop
  const handlePointerDown = useCallback((e: React.PointerEvent, anim: SVGAnimation, type: DragState['type']) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const pos = getAnimationPosition(anim);
    setDragState({
      animId: anim.id,
      type,
      startX: e.clientX,
      originalStart: pos.start,
      originalDuration: pos.duration,
    });
  }, [getAnimationPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState || !scrollContainerRef.current) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaSeconds = deltaX / PIXELS_PER_SECOND;

    const anim = animations.find((a) => a.id === dragState.animId);
    if (!anim) return;

    if (dragState.type === 'move') {
      // Move entire animation (adjust delay)
      const newStart = Math.max(0, dragState.originalStart + deltaSeconds);
      setAnimationDelay?.(dragState.animId, newStart * 1000);
    } else if (dragState.type === 'resize-start') {
      // Resize from start - adjust delay and duration
      const newStart = Math.max(0, dragState.originalStart + deltaSeconds);
      const startDelta = newStart - dragState.originalStart;
      const newDuration = Math.max(0.1, dragState.originalDuration - startDelta);

      setAnimationDelay?.(dragState.animId, newStart * 1000);
      updateAnimation?.(dragState.animId, { dur: `${newDuration.toFixed(2)}s` });
    } else if (dragState.type === 'resize-end') {
      // Resize from end - adjust duration only
      const newDuration = Math.max(0.1, dragState.originalDuration + deltaSeconds);
      updateAnimation?.(dragState.animId, { dur: `${newDuration.toFixed(2)}s` });
    }
  }, [dragState, animations, setAnimationDelay, updateAnimation]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragState) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  }, [dragState]);

  // Handle click on timeline content area to set playhead
  const handleTimelineContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    // Get click position relative to the content area (which has the timeline width)
    const contentElement = e.currentTarget;
    const rect = contentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < 0) return;
    const time = x / PIXELS_PER_SECOND;
    setAnimationTime?.(Math.max(0, Math.min(maxDuration, time)));
  }, [dragState, maxDuration, setAnimationTime]);

  // Handlers for label width dragging
  const handleWidthDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingWidth(true);
    setDragStartX(e.clientX);
    setDragStartWidth(timelineLabelWidth);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [timelineLabelWidth]);

  const handleWidthDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingWidth) return;
    const deltaX = e.clientX - dragStartX;
    const newWidth = Math.max(120, dragStartWidth + deltaX); // Minimum width of 120px
    setTimelineLabelWidth?.(newWidth);
  }, [isDraggingWidth, dragStartX, dragStartWidth, setTimelineLabelWidth]);

  const handleWidthDragEnd = useCallback((e: React.PointerEvent) => {
    if (isDraggingWidth) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDraggingWidth(false);
    }
  }, [isDraggingWidth]);

  const handleWidthDoubleClick = useCallback(() => {
    setTimelineLabelWidth?.(170); // Reset to original width
  }, [setTimelineLabelWidth]);

  const renderThumbnail = (targetId: string) => {
    const { element } = resolveTarget(targetId);
    if (!element) return null;

    let thumbnail: React.ReactNode = null;

    if (element.type === 'path') {
      const { commands } = getItemThumbnailData('element', element.data as PathData);
      if (commands.length > 0) {
        thumbnail = <PathThumbnail commands={commands} />;
      }
    } else if (element.type === 'group') {
      const commands = getGroupThumbnailCommands(element.data.childIds as string[] | undefined, elements);
      if (commands.length > 0) {
        thumbnail = <PathThumbnail commands={commands} />;
      }
    } else {
      const contribution = elementContributionRegistry.getContribution(element.type);
      thumbnail = contribution?.renderThumbnail?.(element, {
        viewport: { zoom: 1, panX: 0, panY: 0 },
        elementMap,
      });
    }

    if (!thumbnail) return null;

    return (
      <Box width="20px" height="20px" flexShrink={0} display="flex" alignItems="center" justifyContent="center">
        {thumbnail}
      </Box>
    );
  };

  return (
    <VStack spacing={3} align="stretch">
      {/* Playback & Management Controls - All in one row */}
      <HStack spacing={2}>
        <HStack spacing={1}>
          <PanelActionButton icon={SkipBack} iconSize={14} label="-0.5s" onClick={() => handleSkip(-0.5)} />
          <PanelActionButton
            icon={animationState?.isPlaying ? Pause : Play}
            iconSize={14}
            label={animationState?.isPlaying ? 'Pause' : 'Play'}
            onClick={handlePlayPause}
          />
          <PanelActionButton icon={SkipForward} iconSize={14} label="+0.5s" onClick={() => handleSkip(0.5)} />
          <PanelActionButton icon={Square} iconSize={14} label="Stop" onClick={() => stopAnimations?.()} />
        </HStack>
        <Box flex={1}>
          <SliderControl
            value={animationState?.currentTime ?? 0}
            min={0}
            max={maxDuration}
            step={0.05}
            onChange={handleScrub}
            formatter={(v) => `${v.toFixed(1)}s`}
            valueWidth="45px"
            marginBottom="0"
          />
        </Box>
        <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }} whiteSpace="nowrap">
          / {maxDuration.toFixed(1)}s
        </Text>
        <HStack spacing={1}>
          <PanelActionButton
            icon={Plus}
            iconSize={14}
            label="Add Animation"
            onClick={() => onAddNew?.()}
          />
          <PanelActionButton
            icon={Trash2}
            iconSize={14}
            label="Clear All"
            onClick={() => animations.forEach((a) => removeAnimation?.(a.id))}
            isDisabled={!animations.length}
          />
        </HStack>
      </HStack>

      {/* Visual Gantt Timeline */}
      <Box>


        {animations.length === 0 ? (
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.400' }}>
            No animations to display
          </Text>
        ) : (
          <Box
            bg={bgColor}
            borderRadius="md"
            border="1px solid"
            borderColor={gridColor}
            overflowX="hidden"
            overflowY="auto"
            maxH="420px"
            minH="150px"
            onPointerMove={handleWidthDragMove}
            onPointerUp={handleWidthDragEnd}
          >
            {/* 
              Timeline structure:
              - Fixed label column on the left
              - Scrollable content area on the right containing:
                - Time scale header (sticky top)
                - Tracks with animation bars
                - Playhead that scrolls with content
            */}
            <HStack spacing={0} align="stretch">
              {/* Fixed Label Column */}
              <VStack spacing={0} flexShrink={0} w={`${timelineLabelWidth}px`} borderRight="1px solid" borderColor={gridColor}>
                {/* Header for labels */}
                <Box h={`${TIME_SCALE_HEIGHT}px`} w="100%" borderBottom="1px solid" borderColor={gridColor} bg={bgColor} />

                {/* Track labels */}
                {sortedAnimations.map((anim) => {
                  // For transitive animations, use previewElementId if available
                  const displayElementId = anim.previewElementId ?? anim.targetElementId;
                  const resolved = resolveTarget(displayElementId);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const displayName = (resolved.element?.data as any)?.name ?? resolved.element?.id ?? displayElementId;
                  
                  // Determine display type based on animation's def targets
                  const isTransitive = Boolean(anim.gradientTargetId || anim.patternTargetId || anim.clipPathTargetId || anim.filterTargetId || anim.maskTargetId || anim.markerTargetId);
                  let displayType = '';
                  if (anim.gradientTargetId) {
                    displayType = anim.stopIndex !== undefined ? `gradient[${anim.stopIndex}]` : 'gradient';
                  } else if (anim.patternTargetId) {
                    displayType = 'pattern';
                  } else if (anim.clipPathTargetId) {
                    displayType = 'clipPath';
                  } else if (anim.filterTargetId) {
                    displayType = anim.filterPrimitiveIndex !== undefined ? `filter[${anim.filterPrimitiveIndex}]` : 'filter';
                  } else if (anim.maskTargetId) {
                    displayType = 'mask';
                  } else if (anim.markerTargetId) {
                    displayType = 'marker';
                  } else if (resolved.type !== 'direct') {
                    displayType = resolved.label ?? resolved.type;
                  }

                  return (
                    <Box
                      key={anim.id}
                      h={`${TRACK_HEIGHT}px`}
                      w="100%"
                      px={2}
                      borderBottom="1px solid"
                      borderColor={gridColor}
                      bg={trackBg}
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-start"
                      overflow="hidden"
                    >
                      <HStack spacing={2} width="100%" justify="space-between">
                        <HStack spacing={2} flex={1} overflow="hidden">
                          {renderThumbnail(displayElementId)}
                          <VStack spacing={0} align="start" flex={1} overflow="hidden">
                            <HStack spacing={1}>
                              <Text fontSize="xs" fontWeight="medium" noOfLines={1} title={`${anim.type} - ${anim.attributeName ?? anim.transformType ?? 'motion'}`}>
                                {anim.type}
                              </Text>
                              {displayType && (
                                <Text fontSize="2xs" color={isTransitive ? 'purple.400' : 'blue.400'} fontWeight="bold">
                                  {displayType}
                                </Text>
                              )}
                            </HStack>
                            <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                              {displayName} • {anim.attributeName ?? anim.transformType ?? 'motion'}
                            </Text>
                          </VStack>
                        </HStack>
                        <Menu isLazy>
                          <MenuButton
                            as={IconButton}
                            icon={<MoreVertical size={12} />}
                            variant="ghost"
                            size="xs"
                            minW="auto"
                            h="20px"
                            w="20px"
                            aria-label="Options"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList minW="100px" zIndex={10}>
                            <MenuItem icon={<Edit size={12} />} fontSize="xs" onClick={() => onEditAnimation?.(anim)}>
                              Edit
                            </MenuItem>
                            <MenuItem icon={<Play size={12} />} fontSize="xs" onClick={() => onPreviewAnimation?.(anim)}>
                              Preview
                            </MenuItem>
                            <MenuItem icon={<Trash2 size={12} />} fontSize="xs" onClick={() => removeAnimation?.(anim.id)} color="red.500">
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>

              {/* Dragger for resizing label column */}
              <Box
                w="4px"
                bg={gridColor}
                cursor="col-resize"
                _hover={{ bg: 'blue.400' }}
                onPointerDown={handleWidthDragStart}
                onDoubleClick={handleWidthDoubleClick}
                onPointerMove={handleWidthDragMove}
                onPointerUp={handleWidthDragEnd}
                onPointerLeave={handleWidthDragEnd}
                flexShrink={0}
              />

              {/* Scrollable Content Area */}
              <Box
                ref={scrollContainerRef}
                flex={1}
                overflowX="auto"
                overflowY="hidden"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* Content wrapper - this is what scrolls and contains everything */}
                <Box position="relative" w={`${timelineWidth}px`} minW="100%">
                  {/* Time Scale Header */}
                  <Box
                    h={`${TIME_SCALE_HEIGHT}px`}
                    borderBottom="1px solid"
                    borderColor={gridColor}
                    bg={bgColor}
                    position="relative"
                    onClick={handleTimelineContentClick}
                    cursor="pointer"
                  >
                    {timeMarkers.map((t) => (
                      <Text
                        key={t}
                        position="absolute"
                        left={`${t * PIXELS_PER_SECOND}px`}
                        top="50%"
                        transform="translate(-50%, -50%)"
                        fontSize="xs"
                        color="gray.500"
                        pointerEvents="none"
                      >
                        {t}s
                      </Text>
                    ))}

                    {/* Playhead triangle in header */}
                    <Box
                      position="absolute"
                      left={`${playheadX}px`}
                      bottom={0}
                      transform="translateX(-50%)"
                      pointerEvents="none"
                      zIndex={2}
                    >
                      <Box
                        w={0}
                        h={0}
                        borderLeft="5px solid transparent"
                        borderRight="5px solid transparent"
                        borderTop="8px solid"
                        borderTopColor={playheadColor}
                      />
                    </Box>
                  </Box>

                  {/* Animation Tracks */}
                  {sortedAnimations.map((anim) => {
                    const pos = getAnimationPosition(anim);
                    const isHovered = hoveredAnim === anim.id;
                    const isDragging = dragState?.animId === anim.id;
                    const left = pos.start * PIXELS_PER_SECOND;
                    const width = pos.duration * PIXELS_PER_SECOND;

                    return (
                      <Box
                        key={anim.id}
                        h={`${TRACK_HEIGHT}px`}
                        borderBottom="1px solid"
                        borderColor={gridColor}
                        bg={trackBg}
                        position="relative"
                        onClick={handleTimelineContentClick}
                        cursor="pointer"
                      >
                        {/* Grid lines */}
                        {timeMarkers.map((t) => (
                          <Box
                            key={t}
                            position="absolute"
                            left={`${t * PIXELS_PER_SECOND}px`}
                            top={0}
                            bottom={0}
                            w="1px"
                            bg={gridColor}
                            opacity={0.5}
                            pointerEvents="none"
                          />
                        ))}

                        {/* Animation Bar */}
                        <Box
                          position="absolute"
                          top="4px"
                          bottom="4px"
                          left={`${left}px`}
                          w={`${Math.max(width, 20)}px`}
                          bg={isHovered || isDragging ? barHoverColor : barColor}
                          borderRadius="4px"
                          cursor={isDragging ? 'grabbing' : 'grab'}
                          transition={isDragging ? 'none' : 'background 0.15s'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          onPointerEnter={() => setHoveredAnim(anim.id)}
                          onPointerLeave={() => !isDragging && setHoveredAnim(null)}
                          onPointerDown={(e) => handlePointerDown(e, anim, 'move')}
                          onClick={(e) => e.stopPropagation()}
                          boxShadow={isDragging ? 'md' : 'sm'}
                          _hover={{ boxShadow: 'md' }}
                        >
                          {/* Left resize handle */}
                          <Box
                            position="absolute"
                            left={0}
                            top={0}
                            bottom={0}
                            w={`${HANDLE_WIDTH}px`}
                            cursor="ew-resize"
                            bg={isHovered || isDragging ? handleColor : 'transparent'}
                            borderLeftRadius="4px"
                            opacity={isHovered || isDragging ? 0.8 : 0}
                            transition="opacity 0.15s"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              handlePointerDown(e, anim, 'resize-start');
                            }}
                          />

                          {/* Bar content */}
                          <Text
                            fontSize="xs"
                            color="white"
                            fontWeight="medium"
                            px={2}
                            noOfLines={1}
                            pointerEvents="none"
                            userSelect="none"
                          >
                            {pos.isInfinite ? '∞' : `${pos.duration.toFixed(1)}s`}
                          </Text>

                          {/* Right resize handle */}
                          <Box
                            position="absolute"
                            right={0}
                            top={0}
                            bottom={0}
                            w={`${HANDLE_WIDTH}px`}
                            cursor="ew-resize"
                            bg={isHovered || isDragging ? handleColor : 'transparent'}
                            borderRightRadius="4px"
                            opacity={isHovered || isDragging ? 0.8 : 0}
                            transition="opacity 0.15s"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              handlePointerDown(e, anim, 'resize-end');
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}

                  {/* Playhead line - spans all tracks, inside scrollable content */}
                  <Box
                    position="absolute"
                    top={`${TIME_SCALE_HEIGHT}px`}
                    bottom={0}
                    left={`${playheadX}px`}
                    w="2px"
                    bg={playheadColor}
                    transform="translateX(-50%)"
                    pointerEvents="none"
                    zIndex={1}
                  />
                </Box>
              </Box>
            </HStack>
          </Box>
        )}
      </Box>
    </VStack>
  );
};
