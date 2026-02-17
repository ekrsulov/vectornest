import React from 'react';
import { SimpleGrid, Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { GradientsSlice, GradientDef } from './slice';
import type { PaintPickerProps } from '../../utils/paintContributionRegistry';

const Swatch: React.FC<{
  gradient: GradientDef;
  onClick: () => void;
}> = ({ gradient, onClick }) => {
  const preview = gradient.type === 'linear'
    ? `linear-gradient(${gradient.angle ?? 0}deg, ${gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(',')})`
    : `radial-gradient(circle at ${gradient.cx ?? 50}% ${gradient.cy ?? 50}%, ${gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(',')})`;
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const hoverBorder = useColorModeValue('blue.400', 'blue.200');

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="0"
      cursor="pointer"
      h="28px"
      onClick={onClick}
      _hover={{ borderColor: hoverBorder }}
      bgImage={preview}
      backgroundSize="cover"
      backgroundPosition="center"
      overflow="hidden"
    />
  );
};

export const GradientPicker: React.FC<PaintPickerProps> = ({ onSelect }) => {
  const gradients = useCanvasStore((state) => (state as unknown as GradientsSlice).gradients ?? []);

  return (
    <SimpleGrid columns={6} spacing={1} p={1}>
      {gradients.map((g) => (
        <Swatch
          key={g.id}
          gradient={g}
          onClick={() => onSelect(`url(#${g.id})`)}
        />
      ))}
    </SimpleGrid>
  );
};
