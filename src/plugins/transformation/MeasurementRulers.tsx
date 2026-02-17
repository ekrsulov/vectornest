import React from 'react';

interface MeasurementRulersProps {
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  zoom: number;
  rulerColor?: string;
  textColor?: string;
}

/**
 * Renders measurement rulers with width and height dimensions
 * Used in TransformationOverlay for showing element/subpath dimensions
 */
export const MeasurementRulers: React.FC<MeasurementRulersProps> = ({
  bounds,
  zoom,
  rulerColor = "#666",
  textColor = "#666",
}) => {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const rulerOffset = 20 / zoom;
  const fontSize = 12 / zoom;
  const tickSize = 3 / zoom;

  return (
    <g>
      {/* Bottom ruler (width) */}
      <g>
        {/* Ruler line */}
        <line
          x1={bounds.minX}
          y1={bounds.maxY + rulerOffset}
          x2={bounds.maxX}
          y2={bounds.maxY + rulerOffset}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Left tick */}
        <line
          x1={bounds.minX}
          y1={bounds.maxY + rulerOffset - tickSize}
          x2={bounds.minX}
          y2={bounds.maxY + rulerOffset + tickSize}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Right tick */}
        <line
          x1={bounds.maxX}
          y1={bounds.maxY + rulerOffset - tickSize}
          x2={bounds.maxX}
          y2={bounds.maxY + rulerOffset + tickSize}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Width text */}
        <text
          x={bounds.minX + width / 2}
          y={bounds.maxY + rulerOffset + 12 / zoom}
          textAnchor="middle"
          fontSize={fontSize}
          fill={textColor}
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {Math.round(width)}px
        </text>
      </g>

      {/* Right ruler (height) */}
      <g>
        {/* Ruler line */}
        <line
          x1={bounds.maxX + rulerOffset}
          y1={bounds.minY}
          x2={bounds.maxX + rulerOffset}
          y2={bounds.maxY}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Top tick */}
        <line
          x1={bounds.maxX + rulerOffset - tickSize}
          y1={bounds.minY}
          x2={bounds.maxX + rulerOffset + tickSize}
          y2={bounds.minY}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Bottom tick */}
        <line
          x1={bounds.maxX + rulerOffset - tickSize}
          y1={bounds.maxY}
          x2={bounds.maxX + rulerOffset + tickSize}
          y2={bounds.maxY}
          stroke={rulerColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
        />
        {/* Height text */}
        <text
          x={bounds.maxX + rulerOffset + 12 / zoom}
          y={bounds.minY + height / 2}
          textAnchor="middle"
          fontSize={fontSize}
          fill={textColor}
          pointerEvents="none"
          transform={`rotate(90 ${bounds.maxX + rulerOffset + 12 / zoom} ${bounds.minY + height / 2})`}
          style={{ userSelect: 'none' }}
        >
          {Math.round(height)}px
        </text>
      </g>
    </g>
  );
};
