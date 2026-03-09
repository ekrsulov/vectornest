import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { AspectPlacementRect } from '../utils/aspectPlacement';

interface AspectPlacementPreviewProps {
  rect: AspectPlacementRect;
  viewport: {
    zoom: number;
  };
}

export const AspectPlacementPreview: React.FC<AspectPlacementPreviewProps> = ({
  rect,
  viewport,
}) => {
  const { colorMode } = useColorMode();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      stroke={colorMode === 'dark' ? '#dee2e6' : '#6b7280'}
      strokeWidth={1 / viewport.zoom}
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
      strokeOpacity={0.7}
      fill="none"
    />
  );
};
