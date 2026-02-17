import React from 'react';

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

interface SelectionRectsProps {
  rects: SelectionRect[];
  color: string;
  strokeWidth: number;
}

/**
 * Shared component for rendering selection rectangles
 * Used by both SelectionOverlay and TransformationOverlay
 */
export const SelectionRects: React.FC<SelectionRectsProps> = React.memo(function SelectionRects({
  rects,
  color,
  strokeWidth,
}) {
  return (
    <>
      {rects.map((rect) =>
        rect.width > 0 && rect.height > 0 ? (
          <rect
            key={rect.key}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        ) : null
      )}
    </>
  );
});
