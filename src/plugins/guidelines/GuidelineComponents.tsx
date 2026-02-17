import React from 'react';
import type { SizeMatch, ManualGuide, Bounds } from './types';

interface GuidelineLineProps {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  position: number;
  canvasSize: { width: number; height: number };
  strokeWidth: number;
  color: string;
  dashArray?: string;
  opacity?: number;
}

/**
 * Reusable guideline line component
 * Renders horizontal or vertical lines based on guideline type
 */
export const GuidelineLine: React.FC<GuidelineLineProps> = ({
  type,
  position,
  canvasSize,
  strokeWidth,
  color,
  dashArray,
  opacity = 1
}) => {
  const isVertical = type === 'left' || type === 'right' || type === 'centerX';

  return (
    <line
      x1={isVertical ? position : -canvasSize.width / 2}
      y1={isVertical ? -canvasSize.height / 2 : position}
      x2={isVertical ? position : canvasSize.width * 1.5}
      y2={isVertical ? canvasSize.height * 1.5 : position}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      opacity={opacity}
      pointerEvents="none"
    />
  );
};

interface DistanceLabelProps {
  axis: 'horizontal' | 'vertical';
  start: number;
  end: number;
  distance: number;
  otherAxisPosition: number;
  strokeWidth: number;
  color: string;
  zoom: number;
  opacity?: number;
  withBackground?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Reusable distance label component
 * Renders distance measurement with arrowheads and label
 */
export const DistanceLabel: React.FC<DistanceLabelProps> = ({
  axis,
  start,
  end,
  distance,
  otherAxisPosition,
  strokeWidth,
  color,
  zoom,
  opacity = 1,
  withBackground = true,
  backgroundColor = 'white',
  textColor
}) => {
  const isHorizontal = axis === 'horizontal';
  const arrowSize = 5 / zoom;
  const labelOffset = 10 / zoom;
  const fontSize = 12 / zoom;
  const labelPadding = 15 / zoom;
  const labelHeight = 16 / zoom;

  // Calculate midpoint for label
  const mid = (start + end) / 2;

  return (
    <g opacity={opacity}>
      {/* Main line */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? end : otherAxisPosition}
        y2={isHorizontal ? otherAxisPosition : end}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* Start arrow - two lines forming a V */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* End arrow - two lines forming a V */}
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* Distance label with optional background */}
      <g>
        {withBackground && (
          <rect
            x={isHorizontal ? mid - labelPadding : otherAxisPosition + labelOffset / 2}
            y={isHorizontal ? otherAxisPosition - labelPadding : mid - labelHeight / 2}
            width={labelPadding * 2}
            height={labelHeight}
            fill={backgroundColor}
            rx={3 / zoom}
            ry={3 / zoom}
            pointerEvents="none"
          />
        )}
        <text
          x={isHorizontal ? mid : otherAxisPosition + labelOffset / 2 + labelPadding}
          y={isHorizontal ? otherAxisPosition - labelPadding + labelHeight / 2 + fontSize * 0.1 : mid + fontSize * 0.1}
          fill={textColor || color}
          fontSize={fontSize}
          fontFamily="sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
        >
          {Math.round(distance)}
        </text>
      </g>
    </g>
  );
};

interface ManualGuideLineProps {
  guide: ManualGuide;
  canvasSize: { width: number; height: number };
  strokeWidth: number;
  zoom: number;
}

/**
 * Manual guide line component with interactive features
 */
export const ManualGuideLine: React.FC<ManualGuideLineProps> = ({
  guide,
  canvasSize,
  strokeWidth,
  zoom
}) => {
  const isVertical = guide.type === 'vertical';
  const color = guide.color || '#00BFFF';
  const dashArray = guide.locked ? `${4 / zoom} ${4 / zoom}` : undefined;

  return (
    <g>
      {/* Main guide line */}
      <line
        x1={isVertical ? guide.position : -canvasSize.width / 2}
        y1={isVertical ? -canvasSize.height / 2 : guide.position}
        x2={isVertical ? guide.position : canvasSize.width * 1.5}
        y2={isVertical ? canvasSize.height * 1.5 : guide.position}
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeDasharray={dashArray}
        opacity={0.8}
        pointerEvents="none"
        data-guide-id={guide.id}
      />
      
      {/* Position label at edge */}
      <g>
        <rect
          x={isVertical ? guide.position - 15 / zoom : -canvasSize.width / 2}
          y={isVertical ? -canvasSize.height / 2 : guide.position - 8 / zoom}
          width={30 / zoom}
          height={16 / zoom}
          fill={color}
          opacity={0.9}
          rx={2 / zoom}
          pointerEvents="none"
        />
        <text
          x={isVertical ? guide.position : -canvasSize.width / 2 + 15 / zoom}
          y={isVertical ? -canvasSize.height / 2 + 8 / zoom : guide.position}
          fill="white"
          fontSize={10 / zoom}
          fontFamily="sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
        >
          {Math.round(guide.position)}
        </text>
      </g>
    </g>
  );
};

interface SizeMatchIndicatorProps {
  match: SizeMatch;
  elementBoundsMap: Map<string, Bounds>;
  strokeWidth: number;
  color: string;
  zoom: number;
  backgroundColor: string;
  textColor: string;
}

/**
 * Size match indicator showing when elements have matching dimensions
 * Shows indicators on both the current element AND matching elements
 */
export const SizeMatchIndicator: React.FC<SizeMatchIndicatorProps> = ({
  match,
  elementBoundsMap,
  strokeWidth,
  color,
  zoom,
  backgroundColor,
  textColor
}) => {
  const currentBounds = elementBoundsMap.get(match.currentElementId);
  if (!currentBounds) return null;

  const fontSize = 10 / zoom;
  const labelPadding = 8 / zoom;
  const labelHeight = 14 / zoom;
  
  // Helper to render indicator for a single element
  const renderIndicator = (bounds: Bounds, isMatching: boolean) => {
    const indicatorColor = isMatching ? color : color;
    const opacity = isMatching ? 0.7 : 1;
    
    if (match.type === 'width') {
      const y = bounds.maxY + 10 / zoom;
      const midX = (bounds.minX + bounds.maxX) / 2;
      
      return (
        <g opacity={opacity}>
          {/* Width indicator line */}
          <line
            x1={bounds.minX}
            y1={y}
            x2={bounds.maxX}
            y2={y}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          {/* End caps */}
          <line
            x1={bounds.minX}
            y1={y - 3 / zoom}
            x2={bounds.minX}
            y2={y + 3 / zoom}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <line
            x1={bounds.maxX}
            y1={y - 3 / zoom}
            x2={bounds.maxX}
            y2={y + 3 / zoom}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          {/* Label */}
          <rect
            x={midX - labelPadding}
            y={y - labelHeight / 2}
            width={labelPadding * 2}
            height={labelHeight}
            fill={backgroundColor}
            rx={2 / zoom}
            pointerEvents="none"
          />
          <text
            x={midX}
            y={y}
            fill={textColor}
            fontSize={fontSize}
            fontFamily="sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            W
          </text>
        </g>
      );
    } else {
      // Height
      const x = bounds.maxX + 10 / zoom;
      const midY = (bounds.minY + bounds.maxY) / 2;
      
      return (
        <g opacity={opacity}>
          {/* Height indicator line */}
          <line
            x1={x}
            y1={bounds.minY}
            x2={x}
            y2={bounds.maxY}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          {/* End caps */}
          <line
            x1={x - 3 / zoom}
            y1={bounds.minY}
            x2={x + 3 / zoom}
            y2={bounds.minY}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <line
            x1={x - 3 / zoom}
            y1={bounds.maxY}
            x2={x + 3 / zoom}
            y2={bounds.maxY}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          {/* Label */}
          <rect
            x={x - labelPadding}
            y={midY - labelHeight / 2}
            width={labelPadding * 2}
            height={labelHeight}
            fill={backgroundColor}
            rx={2 / zoom}
            pointerEvents="none"
          />
          <text
            x={x}
            y={midY}
            fill={textColor}
            fontSize={fontSize}
            fontFamily="sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            H
          </text>
        </g>
      );
    }
  };
  
  // Get bounds for matching elements
  const matchingBounds = match.matchingElementIds
    .map(id => ({ id, bounds: elementBoundsMap.get(id) }))
    .filter((item): item is { id: string; bounds: Bounds } => item.bounds !== undefined);

  return (
    <g>
      {/* Current element indicator */}
      {renderIndicator(currentBounds, false)}
      
      {/* Matching elements indicators */}
      {matchingBounds.map(({ id, bounds }) => (
        <React.Fragment key={`size-match-${id}`}>
          {renderIndicator(bounds, true)}
        </React.Fragment>
      ))}
    </g>
  );
};

// NOTE: Angle snapping UI was removed from the Guidelines plugin —
// the indicator component was previously used to show angle snap state.
// Fully removed to avoid unused code and types.


  // NOTE: Angle snapping UI was removed from the Guidelines plugin —
  // the indicator component was previously used to show angle snap state.
  // Left here as a comment for history; fully removed.
