/**
 * MiniTimeline — Compact Gantt-like visualization showing all animations
 * as horizontal colored bars within a shared time axis.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { useThemeColors } from '../../../hooks/useThemeColors';
import type { SVGAnimation } from '../../animationSystem/types';
import { computeTotalDuration } from '../utils/descriptionGenerator';
import { ANIMATION_TYPE_BAR_COLORS } from '../utils/animationTypeColors';

const BAR_HEIGHT = 8;
const TRACK_HEIGHT = 14;
const TIMELINE_PADDING = 4;

interface MiniTimelineProps {
  /** All animations to display */
  animations: SVGAnimation[];
  /** Current playhead time in seconds */
  currentTime: number;
  /** Selected animation ID (highlighted bar) */
  selectedAnimationId: string | null;
  /** Called when user clicks a bar */
  onSelectAnimation: (id: string) => void;
  /** Called when user clicks the timeline to set time */
  onScrub: (time: number) => void;
  /** Chain delays map (animation id → ms) */
  chainDelays?: Map<string, number>;
}

export const MiniTimeline: React.FC<MiniTimelineProps> = ({
  animations,
  currentTime,
  selectedAnimationId,
  onSelectAnimation,
  onScrub,
  chainDelays,
}) => {
  const { input } = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute total timeline duration (max end time)
  const { totalDuration, timeMarkers } = useMemo(() => {
    let maxEnd = 2;
    for (const anim of animations) {
      const delay = (chainDelays?.get(anim.id) ?? 0) / 1000;
      const dur = computeTotalDuration(anim);
      const end = delay + (Number.isFinite(dur) ? dur : 5);
      if (end > maxEnd) maxEnd = end;
    }
    // Round up to nice time value
    const total = Math.ceil(maxEnd * 2) / 2;

    // Generate time markers
    const markers: number[] = [];
    const step = total <= 3 ? 0.5 : total <= 10 ? 1 : 2;
    for (let t = 0; t <= total; t += step) {
      markers.push(Math.round(t * 10) / 10);
    }

    return { totalDuration: total, timeMarkers: markers };
  }, [animations, chainDelays]);

  const timeToPercent = useCallback(
    (time: number) => (time / totalDuration) * 100,
    [totalDuration],
  );

  const handleTimelinePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - TIMELINE_PADDING;
      const width = rect.width - TIMELINE_PADDING * 2;
      const time = Math.max(0, (x / width) * totalDuration);
      onScrub(time);
    },
    [totalDuration, onScrub],
  );

  if (animations.length === 0) return null;

  const totalHeight = animations.length * TRACK_HEIGHT + 20;

  return (
    <Box
      ref={containerRef}
      position="relative"
      w="100%"
      h={`${totalHeight}px`}
      bg="whiteAlpha.50"
      borderRadius="md"
      border="1px solid"
      borderColor={input.borderColor}
      p={`${TIMELINE_PADDING}px`}
      cursor="pointer"
      onPointerDown={handleTimelinePointerDown}
      overflow="hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Time scale header */}
      <Flex
        position="relative"
        h="14px"
        mb="2px"
        align="flex-end"
      >
        {timeMarkers.map((t) => (
          <Text
            key={t}
            position="absolute"
            left={`${timeToPercent(t)}%`}
            transform="translateX(-50%)"
            fontSize="8px"
            color="gray.500"
            userSelect="none"
          >
            {t}s
          </Text>
        ))}
      </Flex>

      {/* Animation bars */}
      {animations.map((anim) => {
        const delay = (chainDelays?.get(anim.id) ?? 0) / 1000;
        const dur = computeTotalDuration(anim);
        const effectiveDur = Number.isFinite(dur) ? dur : totalDuration - delay;
        const left = timeToPercent(delay);
        const width = timeToPercent(effectiveDur);
        const color = ANIMATION_TYPE_BAR_COLORS[anim.type] ?? ANIMATION_TYPE_BAR_COLORS.animate;
        const isSelected = anim.id === selectedAnimationId;

        return (
          <Box
            key={anim.id}
            position="relative"
            h={`${TRACK_HEIGHT}px`}
            display="flex"
            alignItems="center"
          >
            <Box
              position="absolute"
              left={`${left}%`}
              width={`${Math.max(width, 1)}%`}
              height={`${BAR_HEIGHT}px`}
              bg={color}
              opacity={isSelected ? 1 : 0.6}
              borderRadius="sm"
              border={isSelected ? '1px solid white' : 'none'}
              cursor="pointer"
              transition="opacity 0.1s"
              _hover={{ opacity: 0.9 }}
              onPointerDown={(e: React.PointerEvent) => {
                e.stopPropagation();
                onSelectAnimation(anim.id);
              }}
              title={`${anim.attributeName || anim.type} (${anim.dur || '?'})`}
              aria-label={`Animation bar: ${anim.attributeName || anim.type}`}
              role="button"
              tabIndex={0}
              top={`${(TRACK_HEIGHT - BAR_HEIGHT) / 2}px`}
            />
            {/* Indefinite indicator */}
            {!Number.isFinite(dur) && (
              <Text
                position="absolute"
                right={0}
                fontSize="8px"
                color="gray.500"
                top={`${(TRACK_HEIGHT - 10) / 2}px`}
              >
                ∞
              </Text>
            )}
          </Box>
        );
      })}

      {/* Playhead */}
      <Box
        position="absolute"
        left={`${TIMELINE_PADDING + (timeToPercent(currentTime) / 100) * (100 - TIMELINE_PADDING * 2)}%`}
        top={0}
        bottom={0}
        w="1px"
        bg="red.400"
        pointerEvents="none"
        zIndex={2}
      >
        {/* Playhead triangle */}
        <Box
          position="absolute"
          top="-1px"
          left="-3px"
          w={0}
          h={0}
          borderLeft="3px solid transparent"
          borderRight="3px solid transparent"
          borderTop="5px solid"
          borderTopColor="red.400"
        />
      </Box>
    </Box>
  );
};
