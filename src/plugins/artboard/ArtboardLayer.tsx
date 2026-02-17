import React from 'react';
import type { CanvasLayerContext } from '../../types/plugins';
import { useCanvasStore } from '../../store/canvasStore';
import { useColorModeValue } from '@chakra-ui/react';

interface ArtboardLayerProps {
  context: CanvasLayerContext;
}

/** Render the artboard as a background layer */
export const ArtboardLayer: React.FC<ArtboardLayerProps> = (_context) => {
  const artboard = useCanvasStore(state => state.artboard);
  const isWireframeEnabled = useCanvasStore((state) => {
    const wireframe = (state as unknown as { wireframe?: { enabled?: boolean } }).wireframe;
    return wireframe?.enabled ?? false;
  });
  const borderColor = useColorModeValue('rgba(0, 120, 212, 0.5)', 'rgba(100, 180, 255, 0.5)');
  const marginColor = useColorModeValue('rgba(255, 0, 0, 0.3)', 'rgba(255, 100, 100, 0.3)');
  const labelColor = useColorModeValue('rgba(0, 120, 212, 0.8)', 'rgba(100, 180, 255, 0.8)');
  const cornerColor = useColorModeValue('rgba(0, 120, 212, 0.8)', 'rgba(100, 180, 255, 0.8)');

  if (!artboard?.enabled || !artboard.exportBounds) {
    return null;
  }

  const { minX, minY, width, height } = artboard.exportBounds;
  const showMargins = artboard.showMargins;
  const marginSize = artboard.marginSize;
  const backgroundColor = artboard.backgroundColor ?? 'none';
  const shouldRenderBackground = backgroundColor !== 'none' && !isWireframeEnabled;

  // Validate margin size to avoid negative dimensions
  const validMarginSize = Math.min(marginSize, Math.min(width, height) / 2 - 1);

  return (
    <g className="artboard-layer" pointerEvents="none" style={{ isolation: 'isolate' }}>
      {/* Configurable artboard background */}
      {shouldRenderBackground && (
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill={backgroundColor}
        />
      )}

      {/* Artboard border */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="none"
        stroke={borderColor}
        strokeWidth={2}
      />

      {/* Corner indicators */}
      <g fill={cornerColor}>
        <circle cx={minX} cy={minY} r={4} />
        <circle cx={minX + width} cy={minY} r={4} />
        <circle cx={minX} cy={minY + height} r={4} />
        <circle cx={minX + width} cy={minY + height} r={4} />
      </g>

      {/* Safe margins */}
      {showMargins && validMarginSize > 0 && (
        <rect
          x={minX + validMarginSize}
          y={minY + validMarginSize}
          width={width - validMarginSize * 2}
          height={height - validMarginSize * 2}
          fill="none"
          stroke={marginColor}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {/* Width label (top) */}
      <text
        x={minX + width / 2}
        y={minY - 10}
        textAnchor="middle"
        fontSize="10"
        fill={labelColor}
        pointerEvents="none"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {width}
      </text>

      {/* Height label (left side) */}
      <text
        x={minX - 10}
        y={minY + height / 2}
        textAnchor="end"
        fontSize="10"
        fill={labelColor}
        pointerEvents="none"
        transform={`rotate(-90, ${minX - 10}, ${minY + height / 2})`}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {height}
      </text>

      {/* Combined size label (bottom) */}
      <text
        x={minX + width / 2}
        y={minY + height + 15}
        textAnchor="middle"
        fontSize="12"
        fill={labelColor}
        pointerEvents="none"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {width} × {height}
      </text>
    </g>
  );
};
