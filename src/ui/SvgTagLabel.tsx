import React from 'react';

interface SvgTagLabelProps {
  x: number;
  y: number;
  label: string;
  fontSize: number;
  zoom?: number;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  anchor?: 'middle' | 'start' | 'end';
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  opacity?: number;
}

const WIDTH_FACTOR = 0.62;

export const SvgTagLabel: React.FC<SvgTagLabelProps> = ({
  x,
  y,
  label,
  fontSize,
  zoom,
  textColor,
  backgroundColor,
  borderColor,
  anchor = 'middle',
  paddingX = 4,
  paddingY = 2,
  radius = 3,
  opacity = 1,
}) => {
  const normalizedZoom = zoom && zoom > 0 ? zoom : 1;
  const scaledFontSize = fontSize / normalizedZoom;
  const scaledPaddingX = paddingX / normalizedZoom;
  const scaledPaddingY = paddingY / normalizedZoom;
  const scaledRadius = radius / normalizedZoom;
  const scaledBorderWidth = 1 / normalizedZoom;
  const width = label.length * scaledFontSize * WIDTH_FACTOR + scaledPaddingX * 2;
  const height = scaledFontSize + scaledPaddingY * 2;
  const rectX = anchor === 'middle'
    ? x - width / 2
    : anchor === 'end'
      ? x - width
      : x;
  const rectY = y - height / 2;

  return (
    <g opacity={opacity} pointerEvents="none">
      <rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        rx={scaledRadius}
        ry={scaledRadius}
        fill={backgroundColor}
        stroke={borderColor}
        strokeWidth={scaledBorderWidth}
      />
      <text
        x={anchor === 'start' ? rectX + scaledPaddingX : anchor === 'end' ? rectX + width - scaledPaddingX : x}
        y={y}
        fill={textColor}
        fontSize={scaledFontSize}
        fontFamily="monospace"
        textAnchor={anchor}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
};
