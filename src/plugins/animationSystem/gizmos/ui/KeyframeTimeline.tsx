/**
 * KeyframeTimeline Component
 * 
 * Visual timeline for editing multiple keyframes (values attribute).
 * Shows all keyframes as draggable points on a horizontal track.
 * 
 * Features:
 * - Displays all keyframes as markers on a timeline
 * - Allows selecting and editing individual keyframes
 * - Shows the current keyframe value
 * - Supports different value types (numbers, colors, coordinates)
 */

import React, { useCallback, useMemo } from 'react';
import type { GizmoRenderContext } from '../types';
import { formatToPrecision } from '../../../../utils';

interface KeyframeTimelineProps {
  /** Array of keyframe values as strings */
  keyframes: string[];
  /** Currently selected keyframe index */
  selectedIndex: number;
  /** Callback when keyframe is selected */
  onSelectKeyframe: (index: number) => void;
  /** Callback when keyframe value changes */
  onUpdateKeyframe: (index: number, newValue: string) => void;
  /** Render context for positioning and styling */
  ctx: GizmoRenderContext;
  /** Position of the timeline (relative to element) */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Type of value for formatting */
  valueType?: 'number' | 'color' | 'coordinate' | 'percentage' | 'string';
}

/**
 * Renders a horizontal timeline with keyframe markers
 */
export function KeyframeTimeline({
  keyframes,
  selectedIndex,
  onSelectKeyframe,
  ctx,
  position = 'bottom',
  valueType = 'string',
}: KeyframeTimelineProps): React.ReactElement | null {
  const { elementBounds, viewport, colorMode, precision } = ctx;
  const { minX, maxX, minY, maxY } = elementBounds;
  
  const width = maxX - minX;
  const offset = 35 / viewport.zoom;
  
  // Calculate timeline position
  const trackY = position === 'bottom' ? maxY + offset : minY - offset;
  const trackHeight = 8 / viewport.zoom;
  const markerRadius = 6 / viewport.zoom;
  
  // Colors
  const trackColor = colorMode === 'dark' ? '#374151' : '#E5E7EB';
  const markerColor = colorMode === 'dark' ? '#60A5FA' : '#3B82F6';
  const selectedColor = colorMode === 'dark' ? '#F59E0B' : '#D97706';
  const textColor = colorMode === 'dark' ? '#9CA3AF' : '#6B7280';
  
  // Calculate marker positions
  const markerPositions = useMemo(() => {
    if (keyframes.length < 2) return [];
    return keyframes.map((_, i) => ({
      x: minX + (width * i) / (keyframes.length - 1),
      y: trackY,
    }));
  }, [keyframes, minX, width, trackY]);
  
  // Format value for display
  const formatValue = useCallback((value: string): string => {
    if (valueType === 'number') {
      const num = parseFloat(value);
      return isNaN(num) ? value : String(formatToPrecision(num, precision));
    }
    if (valueType === 'percentage') {
      return value.includes('%') ? value : `${value}%`;
    }
    if (valueType === 'coordinate') {
      // For "x y" or "x,y" format, show abbreviated
      const parts = value.split(/[\s,]+/);
      if (parts.length === 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          return `(${formatToPrecision(x, precision)}, ${formatToPrecision(y, precision)})`;
        }
      }
    }
    // Truncate long values
    return value.length > 8 ? value.slice(0, 6) + '…' : value;
  }, [valueType, precision]);
  
  if (keyframes.length < 3) {
    return null; // Don't render for simple from/to animations
  }
  
  return (
    <g className="keyframe-timeline" data-keyframe-count={keyframes.length}>
      {/* Track background */}
      <rect
        x={minX}
        y={trackY - trackHeight / 2}
        width={width}
        height={trackHeight}
        fill={trackColor}
        rx={trackHeight / 2}
      />
      
      {/* Progress segments between keyframes */}
      {markerPositions.slice(0, -1).map((pos, i) => {
        const nextPos = markerPositions[i + 1];
        const isBeforeSelected = i < selectedIndex;
        return (
          <line
            key={`segment-${i}`}
            x1={pos.x}
            y1={trackY}
            x2={nextPos.x}
            y2={trackY}
            stroke={isBeforeSelected ? markerColor : trackColor}
            strokeWidth={trackHeight * 0.6}
            strokeLinecap="round"
            opacity={0.7}
          />
        );
      })}
      
      {/* Keyframe markers */}
      {markerPositions.map((pos, i) => {
        const isSelected = i === selectedIndex;
        const isEndpoint = i === 0 || i === keyframes.length - 1;
        
        return (
          <g
            key={`keyframe-${i}`}
            className="keyframe-marker"
            data-keyframe-index={i}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectKeyframe(i)}
          >
            {/* Marker circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isSelected ? markerRadius * 1.3 : markerRadius}
              fill={isSelected ? selectedColor : isEndpoint ? markerColor : colorMode === 'dark' ? '#4B5563' : '#9CA3AF'}
              stroke={isSelected ? colorMode === 'dark' ? '#FCD34D' : '#F59E0B' : 'none'}
              strokeWidth={2 / viewport.zoom}
            />
            
            {/* Index label */}
            <text
              x={pos.x}
              y={pos.y}
              fontSize={8 / viewport.zoom}
              fill="white"
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {i + 1}
            </text>
            
            {/* Value label (shown for selected or on hover) */}
            {isSelected && (
              <text
                x={pos.x}
                y={position === 'bottom' ? pos.y + markerRadius + 12 / viewport.zoom : pos.y - markerRadius - 8 / viewport.zoom}
                fontSize={9 / viewport.zoom}
                fill={textColor}
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {formatValue(keyframes[i])}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Total keyframes label */}
      <text
        x={maxX + 10 / viewport.zoom}
        y={trackY + 3 / viewport.zoom}
        fontSize={9 / viewport.zoom}
        fill={textColor}
      >
        {keyframes.length} kf
      </text>
    </g>
  );
}

export default KeyframeTimeline;
