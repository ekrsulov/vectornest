import React, { useMemo } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import type { TextPathPreset } from './presets';

interface TextPathItemCardProps {
  preset: TextPathPreset;
  isSelected?: boolean;
  isPlacementActive?: boolean;
  onClick?: () => void;
}

export const TextPathItemCard: React.FC<TextPathItemCardProps> = ({
  preset,
  isSelected,
  isPlacementActive,
  onClick,
}) => {
  const pathStroke = useColorModeValue('#555555', '#aaaaaa');
  const textFill = useColorModeValue('#222222', '#dddddd');

  const pathD = useMemo(() => preset.generatePath(68), [preset]);
  const refId = `tp-card-${preset.id}`;

  return (
    <LibraryItemCard
      name={preset.label}
      isSelected={isSelected}
      isPlacementActive={isPlacementActive}
      onClick={onClick}
      preview={
        <svg viewBox="-4 -4 76 76" width="100%" height="100%">
          <defs>
            <path id={refId} d={pathD} />
          </defs>
          <use href={`#${refId}`} fill="none" stroke={pathStroke} strokeWidth="4" />
          <text fontSize="18" fill={textFill} fontFamily="Arial">
            <textPath
              href={`#${refId}`}
              startOffset={`${preset.defaultStartOffset}%`}
              textAnchor={preset.defaultTextAnchor}
            >
              Text on path
            </textPath>
          </text>
        </svg>
      }
    />
  );
};
