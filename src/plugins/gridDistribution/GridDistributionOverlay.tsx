import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';

export const GridDistributionOverlay: React.FC = () => {
  const overlay = useCanvasStore((state) => (state as unknown as { gridDistributionOverlay?: { visible?: boolean; lines?: Array<{ x1: number; y1: number; x2: number; y2: number }> } }).gridDistributionOverlay);
  const stroke = useColorModeValue('#000', '#fff');

  if (!overlay?.visible || !overlay.lines?.length) {
    return null;
  }

  return (
    <g data-grid-distribution-overlay>
      {overlay.lines.map((line, idx) => (
        <line
          key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}-${idx}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}
    </g>
  );
};
