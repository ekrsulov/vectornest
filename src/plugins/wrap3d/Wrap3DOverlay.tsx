import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { Viewport } from '../../types';
import type { ShapeBounds, ShapeType } from './wrap3dUtils';

interface Wrap3DOverlayProps {
  bounds: ShapeBounds;
  viewport: Viewport;
  shapeType: ShapeType;
  radiusMultiplier: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

/**
 * Renders a visual representation of the 3D shape during preview.
 * Shows the shape as wireframe with guide lines.
 */
export const Wrap3DOverlay: React.FC<Wrap3DOverlayProps> = ({
  bounds,
  viewport,
  shapeType,
  radiusMultiplier,
  rotationX,
  rotationY,
  rotationZ,
}) => {
  // Theme-aware colors
  const shapeStroke = useColorModeValue('#9ca3af', '#6b7280');
  const shapeFill = useColorModeValue('rgba(156, 163, 175, 0.05)', 'rgba(107, 114, 128, 0.08)');
  const gridStroke = useColorModeValue('rgba(156, 163, 175, 0.3)', 'rgba(107, 114, 128, 0.4)');
  const equatorStroke = useColorModeValue('rgba(59, 130, 246, 0.5)', 'rgba(96, 165, 250, 0.5)');

  const radius = bounds.radius * radiusMultiplier;
  const strokeWidth = 1 / viewport.zoom;

  // Convert rotation to radians for calculations
  const rx = (rotationX * Math.PI) / 180;
  const ry = (rotationY * Math.PI) / 180;

  const equatorTilt = Math.sin(rx);
  const meridianTilt = Math.sin(ry);

  // Render different overlays based on shape type
  const renderShapeOverlay = () => {
    switch (shapeType) {
      case 'sphere':
        return renderSphereOverlay();
      case 'cylinder':
        return renderCylinderOverlay();
      case 'torus':
        return renderTorusOverlay();
      case 'cone':
        return renderConeOverlay();
      case 'ellipsoid':
        return renderEllipsoidOverlay();
      case 'wave':
        return renderWaveOverlay();
      default:
        return renderSphereOverlay();
    }
  };

  const renderSphereOverlay = () => {
    // Generate latitude lines
    const latitudeLines = [];
    const latitudeAngles = [-45, -22.5, 22.5, 45];
    
    for (const latDeg of latitudeAngles) {
      const latRad = (latDeg * Math.PI) / 180;
      const latRadius = radius * Math.cos(latRad);
      const latY = radius * Math.sin(latRad);
      const visualY = latY * Math.cos(rx);
      const visualDepth = latY * Math.sin(rx);
      
      if (visualDepth <= radius * 0.5) {
        latitudeLines.push(
          <ellipse
            key={`lat-${latDeg}`}
            cx={bounds.centerX}
            cy={bounds.centerY + visualY}
            rx={latRadius}
            ry={Math.abs(latRadius * equatorTilt) || strokeWidth}
            fill="none"
            stroke={gridStroke}
            strokeWidth={strokeWidth * 0.5}
            strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
            transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
          />
        );
      }
    }

    // Generate longitude lines
    const longitudeLines = [];
    const longitudeAngles = [-60, -30, 30, 60];
    
    for (const longDeg of longitudeAngles) {
      const longRad = (longDeg * Math.PI) / 180 + ry;
      const visualWidth = Math.abs(radius * Math.sin(longRad));
      
      if (Math.cos(longRad) > -0.3) {
        longitudeLines.push(
          <ellipse
            key={`long-${longDeg}`}
            cx={bounds.centerX}
            cy={bounds.centerY}
            rx={visualWidth || strokeWidth}
            ry={radius}
            fill="none"
            stroke={gridStroke}
            strokeWidth={strokeWidth * 0.5}
            strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
            transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
          />
        );
      }
    }

    return (
      <>
        <circle
          cx={bounds.centerX}
          cy={bounds.centerY}
          r={radius}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
        />
        {latitudeLines}
        {longitudeLines}
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY}
          rx={radius}
          ry={Math.abs(radius * equatorTilt) || strokeWidth}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY}
          rx={Math.abs(radius * meridianTilt) || strokeWidth}
          ry={radius}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
      </>
    );
  };

  const renderCylinderOverlay = () => {
    const height = bounds.height * radiusMultiplier;
    const halfHeight = height / 2;

    return (
      <>
        {/* Main cylinder body */}
        <rect
          x={bounds.centerX - radius}
          y={bounds.centerY - halfHeight}
          width={radius * 2}
          height={height}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Top ellipse */}
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY - halfHeight}
          rx={radius}
          ry={radius * 0.3}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Bottom ellipse */}
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY + halfHeight}
          rx={radius}
          ry={radius * 0.3}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
      </>
    );
  };

  const renderTorusOverlay = () => {
    const majorRadius = radius * 1.2;
    const minorRadius = radius * 0.4;

    return (
      <>
        {/* Outer circle */}
        <circle
          cx={bounds.centerX}
          cy={bounds.centerY}
          r={majorRadius + minorRadius}
          fill="none"
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
        />
        {/* Inner circle (hole) */}
        <circle
          cx={bounds.centerX}
          cy={bounds.centerY}
          r={majorRadius - minorRadius}
          fill="none"
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
        />
        {/* Center line */}
        <circle
          cx={bounds.centerX}
          cy={bounds.centerY}
          r={majorRadius}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          strokeDasharray={`${6 / viewport.zoom} ${3 / viewport.zoom}`}
        />
      </>
    );
  };

  const renderConeOverlay = () => {
    const height = bounds.height * radiusMultiplier;
    const halfHeight = height / 2;

    return (
      <>
        {/* Cone triangle */}
        <path
          d={`M ${bounds.centerX} ${bounds.centerY - halfHeight} 
              L ${bounds.centerX - radius} ${bounds.centerY + halfHeight} 
              L ${bounds.centerX + radius} ${bounds.centerY + halfHeight} Z`}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Base ellipse */}
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY + halfHeight}
          rx={radius}
          ry={radius * 0.3}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
      </>
    );
  };

  const renderEllipsoidOverlay = () => {
    return (
      <>
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY}
          rx={radius * 1.2}
          ry={radius * 0.8}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Horizontal guide */}
        <ellipse
          cx={bounds.centerX}
          cy={bounds.centerY}
          rx={radius * 1.2}
          ry={Math.abs(radius * 0.8 * equatorTilt) || strokeWidth}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
      </>
    );
  };

  const renderWaveOverlay = () => {
    // Generate wave path
    const points: string[] = [];
    const numPoints = 50;
    const waveHeight = radius * 0.3;
    const frequency = 3;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = bounds.centerX - radius + t * radius * 2;
      const y = bounds.centerY + Math.sin(t * Math.PI * frequency) * waveHeight;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return (
      <>
        {/* Wave surface representation */}
        <rect
          x={bounds.centerX - radius}
          y={bounds.centerY - radius * 0.5}
          width={radius * 2}
          height={radius}
          fill={shapeFill}
          stroke={shapeStroke}
          strokeWidth={strokeWidth}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Wave line */}
        <path
          d={points.join(' ')}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth * 1.5}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
        {/* Second wave line */}
        <path
          d={points.join(' ')}
          fill="none"
          stroke={equatorStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY}) translate(0, ${radius * 0.3})`}
        />
      </>
    );
  };

  // Center cross for reference
  const renderCenterCross = () => (
    <>
      <line
        x1={bounds.centerX - 5 / viewport.zoom}
        y1={bounds.centerY}
        x2={bounds.centerX + 5 / viewport.zoom}
        y2={bounds.centerY}
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={bounds.centerX}
        y1={bounds.centerY - 5 / viewport.zoom}
        x2={bounds.centerX}
        y2={bounds.centerY + 5 / viewport.zoom}
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
      />
    </>
  );

  return (
    <g className="wrap3d-overlay" pointerEvents="none">
      {renderShapeOverlay()}
      {renderCenterCross()}
    </g>
  );
};

// Export for backward compatibility
export const SphereOverlay = Wrap3DOverlay;
