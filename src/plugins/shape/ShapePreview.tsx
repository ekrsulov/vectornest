import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import { BEZIER_CIRCLE_KAPPA } from '../../utils/bezierCircle';
import type { Point } from '../../types';

interface ShapePreviewProps {
  selectedShape?: string;
  shapeStart: Point;
  shapeEnd: Point;
  viewport: {
    zoom: number;
  };
}

export const ShapePreview: React.FC<ShapePreviewProps> = ({
  selectedShape = 'rectangle',
  shapeStart,
  shapeEnd,
  viewport,
}) => {
  const { colorMode } = useColorMode();
  
  // Use gray tones for shape preview
  const previewColor = colorMode === 'dark' ? '#dee2e6' : '#6b7280'; // gray.300 : gray.500

  const width = Math.abs(shapeEnd.x - shapeStart.x);
  const height = Math.abs(shapeEnd.y - shapeStart.y);
  const centerX = (shapeStart.x + shapeEnd.x) / 2;
  const centerY = (shapeStart.y + shapeEnd.y) / 2;

  let pathData = '';

  switch (selectedShape) {
    case 'square': {
      const halfSize = Math.min(width, height) / 2;
      pathData = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY - halfSize}`;
      break;
    }
    case 'rectangle': {
      pathData = `M ${shapeStart.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeStart.y}`;
      break;
    }
    case 'circle': {
      const radius = Math.min(width, height) / 2;
      const kappa = BEZIER_CIRCLE_KAPPA;
      pathData = `M ${centerX - radius} ${centerY} C ${centerX - radius} ${centerY - radius * kappa} ${centerX - radius * kappa} ${centerY - radius} ${centerX} ${centerY - radius} C ${centerX + radius * kappa} ${centerY - radius} ${centerX + radius} ${centerY - radius * kappa} ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius * kappa} ${centerX + radius * kappa} ${centerY + radius} ${centerX} ${centerY + radius} C ${centerX - radius * kappa} ${centerY + radius} ${centerX - radius} ${centerY + radius * kappa} ${centerX - radius} ${centerY}`;
      break;
    }
    case 'triangle': {
      pathData = `M ${centerX} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} L ${centerX} ${shapeStart.y}`;
      break;
    }
    case 'line': {
      pathData = `M ${shapeStart.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y}`;
      break;
    }
    case 'diamond': {
      pathData = `M ${centerX} ${centerY - height / 2} L ${centerX + width / 2} ${centerY} L ${centerX} ${centerY + height / 2} L ${centerX - width / 2} ${centerY} Z`;
      break;
    }
    case 'heart': {
      // Heart shape based on provided path, scaled to fit the rectangle
      // Original path center: (105, 105), dimensions: 200x200
      const scaleX = width / 200;
      const scaleY = height / 200;
      const offsetX = centerX - 105 * scaleX;
      const offsetY = centerY - 105 * scaleY;

      const scaledPath = (x: number, y: number) => `${offsetX + x * scaleX} ${offsetY + y * scaleY}`;

      pathData = `M ${scaledPath(105, 65)} C ${scaledPath(105, 25)} ${scaledPath(122, 5)} ${scaledPath(155, 5)} C ${scaledPath(188, 5)} ${scaledPath(205, 25)} ${scaledPath(205, 65)} C ${scaledPath(205, 92)} ${scaledPath(188, 118)} ${scaledPath(155, 145)} C ${scaledPath(122, 172)} ${scaledPath(105, 192)} ${scaledPath(105, 205)} C ${scaledPath(105, 192)} ${scaledPath(88, 172)} ${scaledPath(55, 145)} C ${scaledPath(22, 118)} ${scaledPath(5, 92)} ${scaledPath(5, 65)} C ${scaledPath(5, 25)} ${scaledPath(22, 5)} ${scaledPath(55, 5)} C ${scaledPath(88, 5)} ${scaledPath(105, 25)} ${scaledPath(105, 65)} Z`;
      break;
    }
  }

  return (
    <path
      d={pathData}
      stroke={previewColor}
      strokeWidth={1 / viewport.zoom}
      fill="none"
      strokeOpacity={0.7}
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
    />
  );
};