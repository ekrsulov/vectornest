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

interface ShapeRenderProps {
  bounds: ShapeBounds;
  radius: number;
  strokeWidth: number;
  zoom: number;
  radiusMultiplier: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  equatorTilt: number;
  meridianTilt: number;
  shapeFill: string;
  shapeStroke: string;
  gridStroke: string;
  equatorStroke: string;
}

interface CenterCrossProps {
  centerX: number;
  centerY: number;
  zoom: number;
  stroke: string;
  strokeWidth: number;
}

const SphereOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  zoom,
  rotationX,
  rotationY,
  rotationZ,
  equatorTilt,
  meridianTilt,
  shapeFill,
  shapeStroke,
  gridStroke,
  equatorStroke,
}) => {
  const rx = (rotationX * Math.PI) / 180;
  const ry = (rotationY * Math.PI) / 180;

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
          strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
        />
      );
    }
  }

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
          strokeDasharray={`${4 / zoom} ${4 / zoom}`}
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

const CylinderOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  radiusMultiplier,
  rotationZ,
  shapeFill,
  shapeStroke,
  equatorStroke,
}) => {
  const height = bounds.height * radiusMultiplier;
  const halfHeight = height / 2;

  return (
    <>
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

const TorusOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  zoom,
  shapeStroke,
  equatorStroke,
}) => {
  const majorRadius = radius * 1.2;
  const minorRadius = radius * 0.4;

  return (
    <>
      <circle
        cx={bounds.centerX}
        cy={bounds.centerY}
        r={majorRadius + minorRadius}
        fill="none"
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={bounds.centerX}
        cy={bounds.centerY}
        r={majorRadius - minorRadius}
        fill="none"
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={bounds.centerX}
        cy={bounds.centerY}
        r={majorRadius}
        fill="none"
        stroke={equatorStroke}
        strokeWidth={strokeWidth * 1.5}
        strokeDasharray={`${6 / zoom} ${3 / zoom}`}
      />
    </>
  );
};

const ConeOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  radiusMultiplier,
  rotationZ,
  shapeFill,
  shapeStroke,
  equatorStroke,
}) => {
  const height = bounds.height * radiusMultiplier;
  const halfHeight = height / 2;

  return (
    <>
      <path
        d={`M ${bounds.centerX} ${bounds.centerY - halfHeight} 
            L ${bounds.centerX - radius} ${bounds.centerY + halfHeight} 
            L ${bounds.centerX + radius} ${bounds.centerY + halfHeight} Z`}
        fill={shapeFill}
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
        transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
      />
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

const EllipsoidOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  rotationZ,
  equatorTilt,
  shapeFill,
  shapeStroke,
  equatorStroke,
}) => (
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

const WaveOverlay: React.FC<ShapeRenderProps> = ({
  bounds,
  radius,
  strokeWidth,
  zoom,
  rotationZ,
  shapeFill,
  shapeStroke,
  equatorStroke,
}) => {
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
      <path
        d={points.join(' ')}
        fill="none"
        stroke={equatorStroke}
        strokeWidth={strokeWidth * 1.5}
        transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY})`}
      />
      <path
        d={points.join(' ')}
        fill="none"
        stroke={equatorStroke}
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
        transform={`rotate(${rotationZ} ${bounds.centerX} ${bounds.centerY}) translate(0, ${radius * 0.3})`}
      />
    </>
  );
};

const CenterCross: React.FC<CenterCrossProps> = ({
  centerX,
  centerY,
  zoom,
  stroke,
  strokeWidth,
}) => (
  <>
    <line
      x1={centerX - 5 / zoom}
      y1={centerY}
      x2={centerX + 5 / zoom}
      y2={centerY}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
    <line
      x1={centerX}
      y1={centerY - 5 / zoom}
      x2={centerX}
      y2={centerY + 5 / zoom}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  </>
);

const shapeComponents: Record<ShapeType, React.FC<ShapeRenderProps>> = {
  sphere: SphereOverlay,
  cylinder: CylinderOverlay,
  torus: TorusOverlay,
  cone: ConeOverlay,
  ellipsoid: EllipsoidOverlay,
  wave: WaveOverlay,
};

export const Wrap3DOverlay: React.FC<Wrap3DOverlayProps> = ({
  bounds,
  viewport,
  shapeType,
  radiusMultiplier,
  rotationX,
  rotationY,
  rotationZ,
}) => {
  const shapeStroke = useColorModeValue('#9ca3af', '#6b7280');
  const shapeFill = useColorModeValue('rgba(156, 163, 175, 0.05)', 'rgba(107, 114, 128, 0.08)');
  const gridStroke = useColorModeValue('rgba(156, 163, 175, 0.3)', 'rgba(107, 114, 128, 0.4)');
  const equatorStroke = useColorModeValue('rgba(59, 130, 246, 0.5)', 'rgba(96, 165, 250, 0.5)');

  const radius = bounds.radius * radiusMultiplier;
  const strokeWidth = 1 / viewport.zoom;

  const rx = (rotationX * Math.PI) / 180;
  const ry = (rotationY * Math.PI) / 180;

  const equatorTilt = Math.sin(rx);
  const meridianTilt = Math.sin(ry);

  const shapeProps: ShapeRenderProps = {
    bounds,
    radius,
    strokeWidth,
    zoom: viewport.zoom,
    radiusMultiplier,
    rotationX,
    rotationY,
    rotationZ,
    equatorTilt,
    meridianTilt,
    shapeFill,
    shapeStroke,
    gridStroke,
    equatorStroke,
  };

  const ShapeComponent = shapeComponents[shapeType];

  return (
    <g className="wrap3d-overlay" pointerEvents="none">
      <ShapeComponent {...shapeProps} />
      <CenterCross
        centerX={bounds.centerX}
        centerY={bounds.centerY}
        zoom={viewport.zoom}
        stroke={shapeStroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};
