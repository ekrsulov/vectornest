import React from 'react';

interface CenterMarkerProps {
  centerX: number;
  centerY: number;
  color: string;
  zoom: number;
  showCoordinates?: boolean;
}

/**
 * Renders a center marker (X shape) with optional coordinate label
 * Used in TransformationOverlay for showing element/subpath centers
 */
export const CenterMarker: React.FC<CenterMarkerProps> = ({
  centerX,
  centerY,
  color,
  zoom,
  showCoordinates = false,
}) => {
  const xSize = 8 / zoom;
  const fontSize = 10 / zoom;
  const padding = 4 / zoom;
  const borderRadius = 6 / zoom;
  const centerOffset = 15 / zoom;
  const centerText = `${Math.round(centerX)} , ${Math.round(centerY)}`;
  const textWidth = centerText.length * fontSize * 0.6;

  return (
    <g>
      {/* X lines */}
      <line
        x1={centerX - xSize / 2}
        y1={centerY - xSize / 2}
        x2={centerX + xSize / 2}
        y2={centerY + xSize / 2}
        stroke={color}
        strokeWidth={2 / zoom}
        opacity="0.5"
        pointerEvents="none"
      />
      <line
        x1={centerX - xSize / 2}
        y1={centerY + xSize / 2}
        x2={centerX + xSize / 2}
        y2={centerY - xSize / 2}
        stroke={color}
        strokeWidth={2 / zoom}
        opacity="0.5"
        pointerEvents="none"
      />

      {/* Center coordinates */}
      {showCoordinates && (
        <g>
          <rect
            x={centerX - textWidth / 2 - padding}
            y={centerY + centerOffset}
            width={textWidth + padding * 2}
            height={fontSize + padding * 2}
            fill="#6b7280"
            rx={borderRadius}
            ry={borderRadius}
            opacity="0.5"
            pointerEvents="none"
          />
          <text
            x={centerX}
            y={centerY + centerOffset + fontSize / 2 + padding}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="white"
            fontFamily="Arial, sans-serif"
            pointerEvents="none"
            style={{ fontWeight: 'normal', userSelect: 'none' }}
          >
            {centerText}
          </text>
        </g>
      )}
    </g>
  );
};
