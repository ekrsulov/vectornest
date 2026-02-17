import React from 'react';
import { Box } from '@chakra-ui/react';

interface GizmoKeyframeTrackProps {
  keyTimes: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const GizmoKeyframeTrack: React.FC<GizmoKeyframeTrackProps> = ({
  keyTimes,
  selectedIndex,
  onSelect,
}) => {
  const count = keyTimes.length;
  if (count < 2) return null;

  const normalizedKeyTimes = keyTimes.map((t, i) => {
    if (!Number.isFinite(t)) return i / Math.max(1, count - 1);
    return clamp(t, 0, 1);
  });

  const safeSelectedIndex = clamp(Math.round(selectedIndex), 0, count - 1);

  return (
    <Box
      w="100%"
      h="24px"
      bg="bg.subtle"
      borderRadius="sm"
      position="relative"
      mt={2}
      role="group"
      style={{ touchAction: 'manipulation' }}
    >
      <Box
        position="absolute"
        top="50%"
        left={0}
        right={0}
        h="1px"
        bg="border.subtle"
        transform="translateY(-50%)"
      />

      <Box position="absolute" top={0} bottom={0} left={0} right={0}>
        {normalizedKeyTimes.slice(0, -1).map((t0, i) => {
          const t1 = normalizedKeyTimes[i + 1] ?? t0;
          const widthPercent = Math.max(0, (t1 - t0) * 100);
          const leftPercent = t0 * 100;
          const isSelectedSegment =
            safeSelectedIndex === i || (safeSelectedIndex === i + 1 && i + 1 < count);

          return (
            <Box
              key={`seg-${i}`}
              position="absolute"
              left={`${leftPercent}%`}
              width={`${widthPercent}%`}
              height="100%"
              bg={isSelectedSegment ? 'blue.400' : 'gray.200'}
              opacity={0.35}
              borderRight="1px solid white"
              pointerEvents="none"
            />
          );
        })}
      </Box>

      {normalizedKeyTimes.map((t, i) => {
        const isSelected = i === safeSelectedIndex;
        const label = `Keyframe ${i + 1}/${count} • t=${t.toFixed(2)}`;

        return (
          <Box
            key={`kf-${i}`}
            position="absolute"
            left={`${t * 100}%`}
            top="50%"
            transform="translate(-50%, -50%)"
            zIndex={isSelected ? 10 : 2}
            cursor="pointer"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(i);
            }}
            title={label}
          >
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={isSelected ? 'blue.500' : 'white'}
              border="2px solid"
              borderColor={isSelected ? 'blue.500' : 'gray.400'}
              _hover={{ transform: 'scale(1.2)' }}
            />
          </Box>
        );
      })}
    </Box>
  );
};
