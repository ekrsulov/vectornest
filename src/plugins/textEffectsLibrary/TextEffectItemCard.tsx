import React from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import type { TextEffectPreset } from './types';

interface TextEffectItemCardProps {
  preset: TextEffectPreset;
  isSelected?: boolean;
  onClick?: () => void;
}

export const TextEffectItemCard: React.FC<TextEffectItemCardProps> = ({
  preset,
  isSelected,
  onClick,
}) => {
  const { colorMode } = useColorMode();
  const previewColor = colorMode === 'dark' ? 'white' : 'black';

  const normalizedColorStyles = {
    '& svg *': { stroke: 'currentColor !important' },
    '& svg *:not([fill="none"])': { fill: 'currentColor !important' },
    '& svg *[fill="none"]': { fill: 'none !important' },
  };

  return (
    <LibraryItemCard
      name={preset.label}
      details={preset.category}
      isSelected={isSelected}
      onClick={onClick}
      preview={
        <Box
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color={previewColor}
          sx={{
            '& svg': { width: '100%', height: '100%' },
            ...(preset.preserveColors ? {} : normalizedColorStyles),
          }}
          dangerouslySetInnerHTML={{ __html: preset.previewSvg }}
        />
      }
    />
  );
};
