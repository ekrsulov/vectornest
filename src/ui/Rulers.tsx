import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { useThemeColors } from '../hooks/useThemeColors';
import { useRulerInteractions, type RulerViewport } from '../hooks/useRulerInteractions';
import type { Bounds } from '../utils/boundsUtils';

/** Standard ruler size in pixels */
export const RULER_SIZE = 20;

const TOUCH_ACTION_NONE: React.CSSProperties = { touchAction: 'none' };
const HORIZONTAL_CANVAS_STYLE: React.CSSProperties = {
  width: '100%',
  height: `${RULER_SIZE}px`,
  pointerEvents: 'none',
};
const VERTICAL_CANVAS_STYLE: React.CSSProperties = {
  width: `${RULER_SIZE}px`,
  height: '100%',
  pointerEvents: 'none',
};

interface RulerProjectionBand {
  offset: number;
  size: number;
}

const computeProjectionBand = (
  minValue: number,
  maxValue: number,
  zoom: number,
  pan: number,
  span: number
): RulerProjectionBand | null => {
  if (
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue) ||
    !Number.isFinite(zoom) ||
    !Number.isFinite(pan) ||
    !Number.isFinite(span) ||
    span <= 0
  ) {
    return null;
  }

  const start = minValue * zoom + pan;
  const end = maxValue * zoom + pan;

  if (end <= 0 || start >= span) {
    return null;
  }

  const clampedStart = Math.max(0, Math.min(start, span));
  const clampedEnd = Math.max(0, Math.min(end, span));
  const visibleSize = clampedEnd - clampedStart;

  if (visibleSize <= 0) {
    return null;
  }

  return {
    offset: clampedStart,
    size: Math.max(1, visibleSize),
  };
};

export interface RulersProps {
  /** Width of the ruler area */
  width: number;
  /** Height of the ruler area */
  height: number;
  /** Viewport state for coordinate transformation */
  viewport: RulerViewport;
  /** Whether rulers are interactive (can drag to create guides) */
  interactive?: boolean;
  /** Callback when starting to drag from horizontal ruler */
  onHorizontalDragStart?: (canvasY: number) => void;
  /** Callback when dragging position updates */
  onDragUpdate?: (position: number) => void;
  /** Callback when drag finishes */
  onDragEnd?: () => void;
  /** Callback when starting to drag from vertical ruler */
  onVerticalDragStart?: (canvasX: number) => void;
  /** Optional selection bounds projected into the rulers */
  selectionProjectionBounds?: Bounds | null;
}

/**
 * Calculate tick spacing based on zoom level.
 * Returns a "nice" round number for tick intervals.
 */
function getTickSpacing(zoom: number): number {
  const targetPixels = 50; // Target screen pixels between major ticks
  const canvasUnits = targetPixels / zoom;
  
  // Find a nice round number
  const magnitudes = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const mag of magnitudes) {
    if (canvasUnits <= mag) {
      return mag;
    }
  }
  return 1000;
}

/**
 * Rulers component that displays horizontal and vertical rulers.
 * Can optionally allow dragging to create guides when interactive.
 */
export const Rulers: React.FC<RulersProps> = ({
  width,
  height,
  viewport,
  interactive = false,
  onHorizontalDragStart,
  onVerticalDragStart,
  onDragUpdate,
  onDragEnd,
  selectionProjectionBounds,
}) => {
  const { ruler } = useThemeColors();
  
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);

  // Destructure viewport properties for fine-grained effect dependencies
  const { zoom, panX, panY } = viewport;

  // Calculate tick spacing based on zoom
  const spacing = getTickSpacing(zoom);

  const horizontalProjection = useMemo(
    () => selectionProjectionBounds
      ? computeProjectionBand(selectionProjectionBounds.minX, selectionProjectionBounds.maxX, zoom, panX, width)
      : null,
    [selectionProjectionBounds, zoom, panX, width]
  );

  const verticalProjection = useMemo(
    () => selectionProjectionBounds
      ? computeProjectionBand(selectionProjectionBounds.minY, selectionProjectionBounds.maxY, zoom, panY, height)
      : null,
    [selectionProjectionBounds, zoom, panY, height]
  );

  // Draw horizontal ruler
  useEffect(() => {
    const canvas = horizontalRulerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = RULER_SIZE * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.fillStyle = ruler.bgHex;
    ctx.fillRect(0, 0, width, RULER_SIZE);
    
    // Calculate visible range in canvas coordinates
    const startX = -panX / zoom;
    const endX = (width - panX) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startX / spacing) * spacing;
    
    ctx.fillStyle = ruler.textHex;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasX = firstTick; canvasX <= endX; canvasX += spacing) {
      const screenX = canvasX * zoom + panX;
      
      // Major tick
      ctx.strokeStyle = ruler.tickHex;
      ctx.beginPath();
      ctx.moveTo(screenX, RULER_SIZE - 8);
      ctx.lineTo(screenX, RULER_SIZE);
      ctx.stroke();
      
      // Label
      ctx.fillText(Math.round(canvasX).toString(), screenX, RULER_SIZE - 10);
      
      // Minor ticks
      const minorSpacing = spacing / 5;
      for (let i = 1; i < 5; i++) {
        const minorX = (canvasX + minorSpacing * i) * zoom + panX;
        if (minorX > 0 && minorX < width) {
          ctx.beginPath();
          ctx.moveTo(minorX, RULER_SIZE - 4);
          ctx.lineTo(minorX, RULER_SIZE);
          ctx.stroke();
        }
      }
    }
    
    // Border
    ctx.strokeStyle = ruler.borderHex;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(width, RULER_SIZE - 0.5);
    ctx.stroke();
  }, [width, zoom, panX, spacing, ruler]);

  // Draw vertical ruler
  useEffect(() => {
    const canvas = verticalRulerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = RULER_SIZE * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.fillStyle = ruler.bgHex;
    ctx.fillRect(0, 0, RULER_SIZE, height);
    
    // Calculate visible range in canvas coordinates
    const startY = -panY / zoom;
    const endY = (height - panY) / zoom;
    
    // Find first tick
    const firstTick = Math.floor(startY / spacing) * spacing;
    
    ctx.fillStyle = ruler.textHex;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let canvasY = firstTick; canvasY <= endY; canvasY += spacing) {
      const screenY = canvasY * zoom + panY;
      
      // Major tick
      ctx.strokeStyle = ruler.tickHex;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE - 8, screenY);
      ctx.lineTo(RULER_SIZE, screenY);
      ctx.stroke();
      
      // Label (rotated)
      ctx.save();
      ctx.translate(RULER_SIZE - 10, screenY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(Math.round(canvasY).toString(), 0, 0);
      ctx.restore();
      
      // Minor ticks
      const minorSpacing = spacing / 5;
      for (let i = 1; i < 5; i++) {
        const minorY = (canvasY + minorSpacing * i) * zoom + panY;
        if (minorY > 0 && minorY < height) {
          ctx.beginPath();
          ctx.moveTo(RULER_SIZE - 4, minorY);
          ctx.lineTo(RULER_SIZE, minorY);
          ctx.stroke();
        }
      }
    }
    
    // Border
    ctx.strokeStyle = ruler.borderHex;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, height);
    ctx.stroke();
  }, [height, zoom, panY, spacing, ruler]);

  const { handleHorizontalPointerDown, handleVerticalPointerDown } = useRulerInteractions({
    interactive,
    viewport,
    rulerSize: RULER_SIZE,
    onHorizontalDragStart,
    onVerticalDragStart,
    onDragUpdate,
    onDragEnd,
  });

  return (
    <>
      {/* Horizontal ruler */}
      <Box
        data-testid="horizontal-ruler"
        position="absolute"
        top={0}
        left={`${RULER_SIZE}px`}
        width={`calc(100% - ${RULER_SIZE}px)`}
        height={`${RULER_SIZE}px`}
        zIndex={100}
        cursor={interactive ? 'row-resize' : 'default'}
        onPointerDown={handleHorizontalPointerDown}
        overflow="hidden"
        style={TOUCH_ACTION_NONE}
      >
        {horizontalProjection ? (
          <Box
            data-testid="horizontal-ruler-selection-band"
            position="absolute"
            top="1px"
            left={`${horizontalProjection.offset}px`}
            width={`${horizontalProjection.size}px`}
            height={`${RULER_SIZE - 2}px`}
            borderRadius="sm"
            bg={ruler.projectionFill}
            border="1px solid"
            borderColor={ruler.projectionBorderColor}
            pointerEvents="none"
          />
        ) : null}
        <canvas
          ref={horizontalRulerRef}
          style={HORIZONTAL_CANVAS_STYLE}
        />
      </Box>
      
      {/* Vertical ruler */}
      <Box
        data-testid="vertical-ruler"
        position="absolute"
        top={`${RULER_SIZE}px`}
        left={0}
        width={`${RULER_SIZE}px`}
        height={`calc(100% - ${RULER_SIZE}px)`}
        zIndex={100}
        cursor={interactive ? 'col-resize' : 'default'}
        onPointerDown={handleVerticalPointerDown}
        overflow="hidden"
        style={TOUCH_ACTION_NONE}
      >
        {verticalProjection ? (
          <Box
            data-testid="vertical-ruler-selection-band"
            position="absolute"
            top={`${verticalProjection.offset}px`}
            left="1px"
            width={`${RULER_SIZE - 2}px`}
            height={`${verticalProjection.size}px`}
            borderRadius="sm"
            bg={ruler.projectionFill}
            border="1px solid"
            borderColor={ruler.projectionBorderColor}
            pointerEvents="none"
          />
        ) : null}
        <canvas
          ref={verticalRulerRef}
          style={VERTICAL_CANVAS_STYLE}
        />
      </Box>
      
      {/* Corner box */}
      <Box
        position="absolute"
        top={0}
        left={0}
        width={`${RULER_SIZE}px`}
        height={`${RULER_SIZE}px`}
        bg={ruler.bg}
        borderRight="1px solid"
        borderBottom="1px solid"
        borderColor={ruler.borderColor}
        zIndex={101}
      />
    </>
  );
};
