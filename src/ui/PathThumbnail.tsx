import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import type { Command } from '../types';
import { commandsToString } from '../utils/pathParserUtils';
import { measureCommandsBounds } from '../utils/measurementUtils';

interface PathThumbnailProps {
  commands: Command[];
}

/**
 * Renders a small SVG thumbnail preview of a path
 */
export const PathThumbnail: React.FC<PathThumbnailProps> = ({
  commands
}) => {
  // Use white stroke in dark mode, black in light mode
  const strokeColor = useColorModeValue('#000000', '#ffffff');

  if (commands.length === 0) {
    return (
      <Box
        width="100%"
        height="100%"
        borderRadius="sm"
      />
    );
  }

  // Use centralized bounds calculation
  const bbox = measureCommandsBounds(commands);

  if (!bbox) {
    return (
      <Box
        width="100%"
        height="100%"
        borderRadius="sm"
      />
    );
  }

  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;

  // Add padding (10% of size)
  const padding = Math.max(width, height) * 0.1;
  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const viewBoxX = bbox.minX - padding;
  const viewBoxY = bbox.minY - padding;

  const pathString = commandsToString(commands);

  // Always use no fill for thumbnails
  const fill = 'none';
  const fillOpacity = 1;
  const stroke = strokeColor;

  // Use fixed stroke width for thumbnail
  const thumbnailStrokeWidth = 1;

  return (
    <Box
      width="100%"
      height="100%"
      borderRadius="sm"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathString}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={thumbnailStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
};
