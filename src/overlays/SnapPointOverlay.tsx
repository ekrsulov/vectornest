import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { SnapPoint } from '../utils/snapPointUtils';
import type { Viewport } from '../types';

interface SnapPointCrossOverlayProps {
  snapPoints: SnapPoint[];
  viewport: Viewport;
  opacity?: number; // 0-1
  crossSize?: number; // in canvas units before zoom scaling
  showAllPoints?: boolean; // if false, only shows the active snap point
  activeSnapPoint?: SnapPoint | null;
}

/**
 * Renders snap points as crosses
 * Used for visualizing all available snap points
 */
export const SnapPointCrossOverlay: React.FC<SnapPointCrossOverlayProps> = React.memo(function SnapPointCrossOverlay({
  snapPoints,
  viewport,
  opacity = 0.5,
  crossSize,
  showAllPoints = true,
  activeSnapPoint,
}) {
  const color = useColorModeValue('rgba(51, 65, 85, 1)', 'rgba(203, 213, 225, 1)');
  
  const zoom = viewport.zoom;
  const size = crossSize !== undefined ? crossSize : 4 / zoom;
  const strokeWidth = 0.5 / zoom;
  
  if (!showAllPoints) {
    return null;
  }
  
  return (
    <g className="snap-point-crosses">
      {snapPoints.map((snap) => {
        // Skip the active snap point (it will be rendered separately)
        if (
          activeSnapPoint &&
          snap.point.x === activeSnapPoint.point.x &&
          snap.point.y === activeSnapPoint.point.y
        ) {
          return null;
        }
        
        const { x, y } = snap.point;
        return (
          <g key={`snap-cross-${snap.elementId}-${snap.point.x}-${snap.point.y}`} opacity={opacity}>
            {/* Horizontal line */}
            <line
              x1={x - size}
              y1={y}
              x2={x + size}
              y2={y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Vertical line */}
            <line
              x1={x}
              y1={y - size}
              x2={x}
              y2={y + size}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
});

interface ActiveSnapPointOverlayProps {
  snapPoint: SnapPoint | null;
  viewport: Viewport;
}

/**
 * Renders the active snap point with enhanced visualization (without label)
 * Use FeedbackOverlay separately to show the snap type label
 */
export const ActiveSnapPointOverlay: React.FC<ActiveSnapPointOverlayProps> = React.memo(function ActiveSnapPointOverlay({
  snapPoint,
  viewport,
}) {
  const snapColor = useColorModeValue('#000000', '#ffffff');
  
  if (!snapPoint) {
    return null;
  }
  
  const { point } = snapPoint;
  const zoom = viewport.zoom;
  
  // Visual sizes
  const crossSize = 6 / zoom;
  const outerRingRadius = 12 / zoom;
  const strokeWidth = 2 / zoom;
  
  return (
    <g className="active-snap-point">
      {/* Outer glow ring */}
      <circle
        cx={point.x}
        cy={point.y}
        r={outerRingRadius * 1.5}
        fill="transparent"
        stroke={snapColor}
        strokeWidth={strokeWidth * 0.5}
        opacity={0.3}
        pointerEvents="none"
      />
      
      {/* Middle ring */}
      <circle
        cx={point.x}
        cy={point.y}
        r={outerRingRadius}
        fill="transparent"
        stroke={snapColor}
        strokeWidth={strokeWidth}
        opacity={0.7}
        pointerEvents="none"
      />
      
      {/* Cross indicator */}
      <g opacity={0.9}>
        <line
          x1={point.x - crossSize * 2}
          y1={point.y}
          x2={point.x + crossSize * 2}
          y2={point.y}
          stroke={snapColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pointerEvents="none"
        />
        <line
          x1={point.x}
          y1={point.y - crossSize * 2}
          x2={point.x}
          y2={point.y + crossSize * 2}
          stroke={snapColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pointerEvents="none"
        />
      </g>
      
      {/* Center dot */}
      <circle
        cx={point.x}
        cy={point.y}
        r={crossSize * 0.5}
        fill={snapColor}
        opacity={0.8}
        pointerEvents="none"
      />
    </g>
  );
});

interface SnapPointVisualizationProps {
  allSnapPoints: SnapPoint[];
  activeSnapPoint: SnapPoint | null;
  viewport: Viewport;
  showAllPoints?: boolean;
  allPointsOpacity?: number; // 0-1
}

/**
 * Combined component for rendering both all snap points and the active one
 * Note: Use FeedbackOverlay separately to show the snap type label
 */
export const SnapPointVisualization: React.FC<SnapPointVisualizationProps> = ({
  allSnapPoints,
  activeSnapPoint,
  viewport,
  showAllPoints = true,
  allPointsOpacity = 0.5,
}) => {
  return (
    <g className="snap-point-visualization">
      {/* All available snap points as subtle crosses */}
      {showAllPoints && (
        <SnapPointCrossOverlay
          snapPoints={allSnapPoints}
          viewport={viewport}
          opacity={allPointsOpacity}
          showAllPoints={showAllPoints}
          activeSnapPoint={activeSnapPoint}
        />
      )}
      
      {/* Active snap point with enhanced visualization */}
      <ActiveSnapPointOverlay
        snapPoint={activeSnapPoint}
        viewport={viewport}
      />
    </g>
  );
};
