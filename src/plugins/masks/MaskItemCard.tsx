import React from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import type { MaskDefinition } from './types';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { MASK_PRESETS } from './presets';

interface MaskItemCardProps {
  mask: MaskDefinition & { name?: string };
  isSelected: boolean;
  onDoubleClick?: () => void;
}

export const MaskItemCard: React.FC<MaskItemCardProps> = ({ mask, isSelected, onDoubleClick }) => {
  const { colorMode } = useColorMode();
  const previewColor = colorMode === 'dark' ? 'white' : 'black';

  // Find the preset to get the preview SVG
  const preset = mask.presetId ? MASK_PRESETS.find((p) => p.id === mask.presetId) : null;

  return (
    <LibraryItemCard
      name={mask.name ?? mask.id}
      isSelected={isSelected}
      onClick={onDoubleClick}
      preview={
        preset?.previewSvg ? (
          <Box
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color={previewColor}
            sx={{
              '& svg': { width: '100%', height: '100%' },
            }}
            dangerouslySetInnerHTML={{ __html: preset.previewSvg }}
          />
        ) : (
          <Box
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            color="gray.500"
          >
            M
          </Box>
        )
      }
    />
  );
};
