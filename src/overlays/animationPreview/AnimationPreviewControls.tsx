import React from 'react';
import {
  Box,
  HStack,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
} from '@chakra-ui/react';
import { Pause, Play, Square, X } from 'lucide-react';

interface AnimationPreviewControlsProps {
  isPlaying: boolean;
  currentTime: number;
  maxDuration: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onScrub: (value: number) => void;
  onClose: () => void;
}

export const AnimationPreviewControls: React.FC<AnimationPreviewControlsProps> = ({
  isPlaying,
  currentTime,
  maxDuration,
  onTogglePlay,
  onStop,
  onScrub,
  onClose,
}) => {
  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height="60px"
      bg="gray.800"
      borderTop="1px solid"
      borderColor="gray.600"
      px={4}
      display="flex"
      alignItems="center"
      gap={4}
    >
      <HStack spacing={2}>
        <IconButton
          aria-label={isPlaying ? 'Pause' : 'Play'}
          icon={isPlaying ? <Pause size={18} /> : <Play size={18} />}
          size="sm"
          colorScheme="blue"
          onClick={onTogglePlay}
        />
        <IconButton
          aria-label="Stop"
          icon={<Square size={18} />}
          size="sm"
          variant="ghost"
          onClick={onStop}
        />
      </HStack>

      <Text fontSize="sm" color="gray.300" minW="80px">
        {currentTime.toFixed(2)}s / {maxDuration.toFixed(2)}s
      </Text>

      <Slider
        flex={1}
        value={currentTime}
        min={0}
        max={maxDuration || 1}
        step={0.01}
        onChange={onScrub}
      >
        <SliderTrack bg="gray.600">
          <SliderFilledTrack bg="blue.400" />
        </SliderTrack>
        <SliderThumb boxSize={4} />
      </Slider>

      <IconButton
        aria-label="Close preview"
        icon={<X size={18} />}
        size="sm"
        variant="ghost"
        onClick={onClose}
      />
    </Box>
  );
};
