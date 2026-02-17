import React from 'react';
import type { AnimationPreset } from './types';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { Box, useColorMode } from '@chakra-ui/react';

interface AnimationItemCardProps {
  preset: AnimationPreset;
  isSelected?: boolean;
  onClick?: () => void;
  animationCount?: number;
}

export const AnimationItemCard: React.FC<AnimationItemCardProps> = ({
  preset,
  isSelected,
  onClick,
  animationCount,
}) => {
  const { colorMode } = useColorMode();
  const previewColor = colorMode === 'dark' ? 'white' : 'black';

  // Styles that normalize colors to theme
  const normalizedColorStyles = {
    '& svg *': { stroke: 'currentColor !important' },
    '& svg *:not([fill="none"])': { fill: 'currentColor !important' },
    '& svg *[fill="none"]': { fill: 'none !important' },
  };

  return (
    <LibraryItemCard
      name={preset.name}
      details={
        typeof animationCount === 'number'
          ? `${animationCount} animation${animationCount !== 1 ? 's' : ''}`
          : undefined
      }
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
            // Only apply color normalization if preserveColors is not set
            ...(preset.preserveColors ? {} : normalizedColorStyles),
          }}
          dangerouslySetInnerHTML={{ __html: preset.previewSvg || '' }}
        />
      }
    />
  );
};
