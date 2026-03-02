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
  const artboardDrawColor = useColorModeValue('#000000', '#ffffff');
  const marginColor = useColorModeValue('rgba(255, 0, 0, 0.3)', 'rgba(255, 100, 100, 0.3)');

  if (!artboard?.enabled || !artboard.exportBounds) {
    return null;
  }

  const { minX, minY, width, height } = artboard.exportBounds;
  const showMargins = artboard.showMargins;
  const marginSize = artboard.marginSize;
  const showSizes = artboard.showSizes ?? false;
  const backgroundColor = artboard.backgroundColor ?? 'none';
  const shouldRenderBackground = backgroundColor !== 'none' && !isWireframeEnabled;

  // Validate margin size to avoid negative dimensions
  const validMarginSize = Math.min(marginSize, Math.min(width, height) / 2 - 1);
  const crossSize = 6;

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
        stroke={artboardDrawColor}
        strokeWidth={1}
      />

      {/* Corner indicators */}
      <g stroke={artboardDrawColor} strokeWidth={2} strokeLinecap="round">
        <path d={`M ${minX - crossSize} ${minY} L ${minX + crossSize} ${minY} M ${minX} ${minY - crossSize} L ${minX} ${minY + crossSize}`} />
        <path d={`M ${minX + width - crossSize} ${minY} L ${minX + width + crossSize} ${minY} M ${minX + width} ${minY - crossSize} L ${minX + width} ${minY + crossSize}`} />
        <path d={`M ${minX - crossSize} ${minY + height} L ${minX + crossSize} ${minY + height} M ${minX} ${minY + height - crossSize} L ${minX} ${minY + height + crossSize}`} />
        <path d={`M ${minX + width - crossSize} ${minY + height} L ${minX + width + crossSize} ${minY + height} M ${minX + width} ${minY + height - crossSize} L ${minX + width} ${minY + height + crossSize}`} />
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

      {/* Size labels */}
      {showSizes && (
        <>
          {/* Width label (top) */}
          <text
            x={minX + width / 2}
            y={minY - 10}
            textAnchor="middle"
            fontSize="10"
            fill={artboardDrawColor}
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
            fill={artboardDrawColor}
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
            fill={artboardDrawColor}
            pointerEvents="none"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {width} × {height}
          </text>
        </>
      )}
    </g>
  );
};
