import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import { formatDistance } from '../../utils/measurementUtils';
import type { MeasurementData, SnapInfo } from './slice';
import type { Viewport } from '../../types';

interface MeasureOverlayProps {
  measurement: MeasurementData;
  viewport: Viewport;
  startSnapInfo: SnapInfo | null;
  currentSnapInfo: SnapInfo | null;
  units: 'px' | 'mm' | 'in';
  showInfo: boolean;
  precision: number;
}


export const MeasureOverlay: React.FC<MeasureOverlayProps> = ({
  measurement,
  viewport,
  startSnapInfo,
  currentSnapInfo,
  units,
  showInfo,
  precision,
}) => {
  const { colorMode } = useColorMode();

  const { startPoint, endPoint, isActive } = measurement;

  // Don't render if points are missing. Allow rendering even when not active (frozen)
  if (!startPoint || !endPoint) {
    return null;
  }

  const zoom = viewport.zoom;

  // Colors based on theme
  const lineColor = isActive
    ? (colorMode === 'dark' ? '#3b82f6' : '#2563eb') // blue.500 : blue.600
    : (colorMode === 'dark' ? 'rgba(59,130,246,0.6)' : 'rgba(37,99,235,0.6)');
  const extensionColor = isActive
    ? (colorMode === 'dark' ? '#60a5fa' : '#3b82f6')
    : (colorMode === 'dark' ? 'rgba(96,165,250,0.6)' : 'rgba(59,130,246,0.6)');
  const textColor = colorMode === 'dark' ? '#ffffff' : '#1e293b'; // white : slate.900
  const textBg = colorMode === 'dark' ? '#1e293bb3' : '#ffffffcc'; // slate.800 : white with transparency
  const snapColor = colorMode === 'dark' ? '#f59e0b' : '#d97706'; // amber.500 : amber.600

  // Line properties
  const strokeWidth = 2 / zoom;
  const extensionLength = 12 / zoom;
  const extensionWidth = 1.5 / zoom;

  // Calculate perpendicular vectors for extensions
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Avoid division by zero
  if (length < 0.001) {
    return null;
  }

  // Normalized perpendicular vector
  const perpX = -dy / length;
  const perpY = dx / length;

  // Extension lines at start and end points
  const startExtension = {
    x1: startPoint.x - perpX * extensionLength / 2,
    y1: startPoint.y - perpY * extensionLength / 2,
    x2: startPoint.x + perpX * extensionLength / 2,
    y2: startPoint.y + perpY * extensionLength / 2,
  };

  const endExtension = {
    x1: endPoint.x - perpX * extensionLength / 2,
    y1: endPoint.y - perpY * extensionLength / 2,
    x2: endPoint.x + perpX * extensionLength / 2,
    y2: endPoint.y + perpY * extensionLength / 2,
  };

  // Label position (midpoint of the line, slightly offset)
  const labelX = (startPoint.x + endPoint.x) / 2;
  const labelY = (startPoint.y + endPoint.y) / 2;
  const labelOffset = 8 / zoom;
  const labelOffsetX = labelX + perpX * labelOffset;
  const labelOffsetY = labelY + perpY * labelOffset;

  // Format the distance
  const distanceText = formatDistance(measurement.distance, units, precision);

  // Font size based on zoom - keep constant visual size
  const fontSize = 14 / zoom;

  return (
    <g className="measure-overlay">
      {/* Main measurement line */}
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Extension lines (ticks) */}
      <line
        x1={startExtension.x1}
        y1={startExtension.y1}
        x2={startExtension.x2}
        y2={startExtension.y2}
        stroke={extensionColor}
        strokeWidth={extensionWidth}
        strokeLinecap="round"
      />
      <line
        x1={endExtension.x1}
        y1={endExtension.y1}
        x2={endExtension.x2}
        y2={endExtension.y2}
        stroke={extensionColor}
        strokeWidth={extensionWidth}
        strokeLinecap="round"
      />

      {/* Snap indicators */}
      {startSnapInfo && (
        <circle
          cx={startSnapInfo.point.x}
          cy={startSnapInfo.point.y}
          r={4 / zoom}
          fill={snapColor}
          stroke={textColor}
          strokeWidth={1 / zoom}
        />
      )}
      {currentSnapInfo && (
        <circle
          cx={currentSnapInfo.point.x}
          cy={currentSnapInfo.point.y}
          r={4 / zoom}
          fill={snapColor}
          stroke={textColor}
          strokeWidth={1 / zoom}
        />
      )}

      {/* Distance label */}
      {showInfo && (
        <g transform={`translate(${labelOffsetX}, ${labelOffsetY})`}>
          <text
            x={0}
            y={0}
            fontSize={fontSize}
            fill={textColor}
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="600"
            style={{
              paintOrder: 'stroke',
              stroke: textBg,
              strokeWidth: `${3 / zoom}px`,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            {distanceText}
          </text>
        </g>
      )}

      {/* Start and end point indicators */}
      <circle
        cx={startPoint.x}
        cy={startPoint.y}
        r={3 / zoom}
        fill={lineColor}
        stroke={textColor}
        strokeWidth={1 / zoom}
      />
      <circle
        cx={endPoint.x}
        cy={endPoint.y}
        r={3 / zoom}
        fill={lineColor}
        stroke={textColor}
        strokeWidth={1 / zoom}
      />
    </g>
  );
};
