import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { SymmetryDrawPluginSlice } from './slice';

const GUIDE_EXTENT = 5000;

/**
 * Canvas overlay that renders symmetry guide lines (mirror axes or radial segments)
 * at the configured center point.
 */
export const SymmetryOverlay: React.FC = () => {
  const symmetry = useCanvasStore(
    (state) => (state as unknown as SymmetryDrawPluginSlice).symmetryDraw
  );
  const zoom = useCanvasStore((state) => state.viewport.zoom);

  const primaryColor = useColorModeValue('#6366f1', '#818cf8'); // indigo
  const secondaryColor = useColorModeValue('#a5b4fc', '#4f46e5');

  if (!symmetry?.enabled || !symmetry.showGuides) return null;

  const { mode, centerX, centerY, segments, guideOpacity } = symmetry;
  const strokeWidth = 1 / zoom;
  const dashArray = `${4 / zoom} ${4 / zoom}`;

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; primary: boolean }> = [];

  if (mode === 'mirror-x' || mode === 'mirror-xy') {
    // Vertical axis line (mirrors left-right)
    lines.push({
      x1: centerX,
      y1: centerY - GUIDE_EXTENT,
      x2: centerX,
      y2: centerY + GUIDE_EXTENT,
      primary: true,
    });
  }

  if (mode === 'mirror-y' || mode === 'mirror-xy') {
    // Horizontal axis line (mirrors top-bottom)
    lines.push({
      x1: centerX - GUIDE_EXTENT,
      y1: centerY,
      x2: centerX + GUIDE_EXTENT,
      y2: centerY,
      primary: mode === 'mirror-y',
    });
  }

  if (mode === 'radial') {
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      const dx = Math.cos(angle) * GUIDE_EXTENT;
      const dy = Math.sin(angle) * GUIDE_EXTENT;
      lines.push({
        x1: centerX - dx,
        y1: centerY - dy,
        x2: centerX + dx,
        y2: centerY + dy,
        primary: i === 0,
      });
    }
  }

  // Center marker size
  const markerSize = 6 / zoom;

  return (
    <g data-symmetry-overlay opacity={guideOpacity} pointerEvents="none">
      {/* Guide lines */}
      {lines.map((line, idx) => (
        <line
          key={idx}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.primary ? primaryColor : secondaryColor}
          strokeWidth={strokeWidth}
          strokeDasharray={line.primary ? 'none' : dashArray}
        />
      ))}

      {/* Center cross marker */}
      <line
        x1={centerX - markerSize}
        y1={centerY}
        x2={centerX + markerSize}
        y2={centerY}
        stroke={primaryColor}
        strokeWidth={strokeWidth * 1.5}
      />
      <line
        x1={centerX}
        y1={centerY - markerSize}
        x2={centerX}
        y2={centerY + markerSize}
        stroke={primaryColor}
        strokeWidth={strokeWidth * 1.5}
      />

      {/* Center circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={markerSize * 0.7}
        fill="none"
        stroke={primaryColor}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};
