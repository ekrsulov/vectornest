import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { TrimSegment, TrimIntersection } from './trimPath';

interface TrimPathOverlayProps {
  intersections: TrimIntersection[];
  segments: TrimSegment[];
  hoveredSegmentId: string | null;
  markedSegmentIds: string[];
  isDragging: boolean;
  cursorPath: Array<{ x: number; y: number }>;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}

/**
 * Overlay component for visualizing trim path operations.
 * Shows intersection points and highlights trimmable segments.
 */
const TrimPathOverlay: React.FC<TrimPathOverlayProps> = ({
  intersections,
  segments,
  hoveredSegmentId,
  markedSegmentIds,
  isDragging,
  cursorPath,
  viewport,
}) => {
  // Theme-aware colors
  const intersectionColor = useColorModeValue('#2563eb', '#60a5fa'); // blue.600 / blue.400
  const segmentHoverColor = useColorModeValue('rgba(239, 68, 68, 0.3)', 'rgba(248, 113, 113, 0.4)'); // red with opacity
  const segmentMarkedColor = useColorModeValue('rgba(239, 68, 68, 0.5)', 'rgba(248, 113, 113, 0.6)'); // red more opaque
  const cursorPathColor = useColorModeValue('#dc2626', '#f87171'); // red.600 / red.400
  const intersectionOutlineColor = useColorModeValue('#ffffff', '#1f2937'); // white / gray.800

  const { zoom } = viewport;

  // Scale for zoom-independent sizes (in screen space)
  const markerRadius = 4 / zoom;
  const strokeWidth = 2 / zoom;
  const outlineWidth = 1 / zoom;

  return (
    <g className="trim-path-overlay">
      {/* Render trimmable segments with hover/marked states */}
      {segments.map((segment) => {
        const isHovered = segment.id === hoveredSegmentId;
        const isMarked = markedSegmentIds.includes(segment.id);

        if (!isHovered && !isMarked) return null;

        const color = isMarked ? segmentMarkedColor : segmentHoverColor;

        return (
          <path
            key={segment.id}
            d={segment.pathData}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(8 / zoom, 3)} // Visible hit area
            strokeLinecap={segment.style.strokeLinecap}
            strokeLinejoin={segment.style.strokeLinejoin}
            pointerEvents="none"
          />
        );
      })}

      {/* Render cursor path during drag */}
      {isDragging && cursorPath.length > 1 && (
        <polyline
          points={cursorPath.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={cursorPathColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          pointerEvents="none"
        />
      )}

      {/* Render intersection markers */}
      {intersections.map((intersection) => {
        return (
          <g key={intersection.id}>
            {/* Outline for contrast */}
            <circle
              cx={intersection.point.x}
              cy={intersection.point.y}
              r={markerRadius + outlineWidth}
              fill={intersectionOutlineColor}
              pointerEvents="none"
            />
            {/* Intersection point */}
            <circle
              cx={intersection.point.x}
              cy={intersection.point.y}
              r={markerRadius}
              fill={intersectionColor}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </g>
  );
};

import type { TrimPathPluginSlice } from '../trimPath/slice';

/**
 * Container component that connects to the store.
 */
export const TrimPathOverlayConnected: React.FC = () => {
  const trimPath = useCanvasStore((state) => (state as unknown as TrimPathPluginSlice).trimPath);
  const viewport = useCanvasStore((state) => state.viewport);
  const activePlugin = useCanvasStore((state) => state.activePlugin);

  // Only show overlay when trim tool is active
  if (activePlugin !== 'trimPath' || !trimPath?.isActive || !trimPath.splitResult) {
    return null;
  }



  return (
    <TrimPathOverlay
      intersections={trimPath.splitResult.intersections}
      segments={trimPath.splitResult.segments}
      hoveredSegmentId={trimPath.hoveredSegmentId}
      markedSegmentIds={trimPath.markedSegmentIds}
      isDragging={trimPath.isDragging}
      cursorPath={trimPath.cursorPath}
      viewport={viewport}
    />
  );
};
