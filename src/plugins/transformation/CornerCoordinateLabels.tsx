import React from 'react';

interface CornerCoordinateLabelsProps {
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  zoom: number;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Renders coordinate labels at the top-left and bottom-right corners
 * Used in TransformationOverlay for showing element/subpath bounds
 */
export const CornerCoordinateLabels: React.FC<CornerCoordinateLabelsProps> = ({
  bounds,
  zoom,
  backgroundColor = "#6b7280",
  textColor = "white",
}) => {
  const coordinateOffset = 15 / zoom;
  const fontSize = 10 / zoom;
  const padding = 4 / zoom;
  const borderRadius = 6 / zoom;

  return (
    <g>
      {/* Top-left corner coordinates */}
      <g>
        {(() => {
          const topLeftText = `${Math.round(bounds.minX)} , ${Math.round(bounds.minY)}`;
          const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
          const rectX = bounds.minX - coordinateOffset - padding * 6;
          return (
            <>
              <rect
                x={rectX}
                y={bounds.minY - coordinateOffset - fontSize - padding}
                width={rectWidth}
                height={fontSize + padding * 2}
                fill={backgroundColor}
                rx={borderRadius}
                ry={borderRadius}
                pointerEvents="none"
              />
              <text
                x={rectX + rectWidth / 2}
                y={bounds.minY - coordinateOffset - fontSize / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill={textColor}
                fontFamily="Arial, sans-serif"
                pointerEvents="none"
                style={{ fontWeight: 'normal', userSelect: 'none' }}
              >
                {topLeftText}
              </text>
            </>
          );
        })()}
      </g>

      {/* Bottom-right corner coordinates */}
      <g>
        {(() => {
          const bottomRightText = `${Math.round(bounds.maxX)} , ${Math.round(bounds.maxY)}`;
          const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
          const rectX = bounds.maxX + coordinateOffset;
          return (
            <>
              <rect
                x={rectX}
                y={bounds.maxY + coordinateOffset}
                width={rectWidth}
                height={fontSize + padding * 2}
                fill={backgroundColor}
                rx={borderRadius}
                ry={borderRadius}
                pointerEvents="none"
              />
              <text
                x={rectX + rectWidth / 2}
                y={bounds.maxY + coordinateOffset + fontSize / 2 + padding}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill={textColor}
                fontFamily="Arial, sans-serif"
                pointerEvents="none"
                style={{ fontWeight: 'normal', userSelect: 'none' }}
              >
                {bottomRightText}
              </text>
            </>
          );
        })()}
      </g>
    </g>
  );
};
