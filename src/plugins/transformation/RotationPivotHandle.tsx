import React from 'react';
import type { Point } from '../../types';

interface RotationPivotHandleProps {
  pivot: Point;
  color: string;
  zoom: number;
  showCoordinates?: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  onChange: (pivot: Point) => void;
  disabled?: boolean;
}

/**
 * Draggable rotation pivot handle for simple transformation mode.
 */
export const RotationPivotHandle: React.FC<RotationPivotHandleProps> = ({
  pivot,
  color,
  zoom,
  showCoordinates = false,
  screenToCanvas,
  onChange,
  disabled = false,
}) => {
  const isDraggingRef = React.useRef(false);

  const updatePivot = React.useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    const point = screenToCanvas(event.clientX, event.clientY);
    onChange(point);
  }, [screenToCanvas, onChange]);

  const handlePointerDown = React.useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    if (disabled) return;
    event.stopPropagation();
    event.preventDefault();
    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePivot(event);
  }, [disabled, updatePivot]);

  const handlePointerMove = React.useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    if (disabled || !isDraggingRef.current) return;
    event.stopPropagation();
    event.preventDefault();
    updatePivot(event);
  }, [disabled, updatePivot]);

  const handlePointerUp = React.useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDraggingRef.current) return;
    event.stopPropagation();
    event.preventDefault();
    isDraggingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // Ignore if pointer capture was already released.
    }
  }, []);

  const handlePointerCancel = React.useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDraggingRef.current) return;
    event.stopPropagation();
    event.preventDefault();
    isDraggingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // Ignore if pointer capture was already released.
    }
  }, []);

  const outerRadius = 5 / zoom;
  const innerRadius = 2 / zoom;
  const hitRadius = 12 / zoom;
  const strokeWidth = 2 / zoom;

  const fontSize = 10 / zoom;
  const padding = 4 / zoom;
  const borderRadius = 6 / zoom;
  const centerOffset = 15 / zoom;
  const pivotText = `${Math.round(pivot.x)} , ${Math.round(pivot.y)}`;
  const textWidth = pivotText.length * fontSize * 0.6;

  return (
    <g>
      <circle
        cx={pivot.x}
        cy={pivot.y}
        r={outerRadius}
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
      <circle
        cx={pivot.x}
        cy={pivot.y}
        r={innerRadius}
        fill={color}
        pointerEvents="none"
      />
      <circle
        cx={pivot.x}
        cy={pivot.y}
        r={hitRadius}
        fill="transparent"
        pointerEvents={disabled ? 'none' : 'all'}
        style={{ cursor: disabled ? 'default' : 'move' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {showCoordinates && (
        <g>
          <rect
            x={pivot.x - textWidth / 2 - padding}
            y={pivot.y + centerOffset}
            width={textWidth + padding * 2}
            height={fontSize + padding * 2}
            fill="#6b7280"
            rx={borderRadius}
            ry={borderRadius}
            opacity="0.5"
            pointerEvents="none"
          />
          <text
            x={pivot.x}
            y={pivot.y + centerOffset + fontSize / 2 + padding}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="white"
            fontFamily="Arial, sans-serif"
            pointerEvents="none"
            style={{ fontWeight: 'normal', userSelect: 'none' }}
          >
            {pivotText}
          </text>
        </g>
      )}
    </g>
  );
};
