/**
 * Wrap 3D Utilities
 * 
 * This module provides functions to transform 2D path data onto various 3D surfaces
 * and project them back to 2D with rotation capabilities.
 * 
 * Supported shapes:
 * - Sphere: Spherical projection with uniform curvature
 * - Cylinder: Cylindrical projection for wrapping around a tube
 * - Torus: Toroidal projection for ring/donut shapes
 * - Cone: Conical projection with tapering
 * - Ellipsoid: Ellipsoidal projection with independent axis radii
 * - Wave: Sinusoidal wave surface for cloth/flag effects
 * 
 * The algorithm:
 * 1. Map 2D coordinates to a point on the 3D surface
 * 2. Apply 3D rotation matrices (Euler angles)
 * 3. Project back to 2D using orthographic projection
 */

import type { PathData, SubPath, Command, Point, ControlPoint } from '../../types';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ShapeBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  radius: number;
  aspectRatio: number;
}

/**
 * Available 3D shape types for wrapping
 */
export type ShapeType = 'sphere' | 'cylinder' | 'torus' | 'cone' | 'ellipsoid' | 'wave';

/**
 * Shape-specific parameters
 */
export interface ShapeParams {
  // Common
  radiusMultiplier: number;
  
  // Cylinder
  cylinderHeight: number;
  
  // Torus
  torusMajorRadius: number;
  torusMinorRadius: number;
  
  // Cone
  coneBaseRadius: number;
  coneHeight: number;
  
  // Ellipsoid
  ellipsoidRadiusX: number;
  ellipsoidRadiusY: number;
  ellipsoidRadiusZ: number;
  
  // Wave
  waveAmplitudeX: number;
  waveAmplitudeY: number;
  waveFrequencyX: number;
  waveFrequencyY: number;
  wavePhaseX: number;
  wavePhaseY: number;
}

/**
 * Calculate the bounding box of a path
 */
function calculatePathBounds(pathData: PathData): ShapeBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const subPath of pathData.subPaths) {
    for (const cmd of subPath) {
      if (cmd.type === 'Z') continue;

      const points: Point[] = [cmd.position];
      if (cmd.type === 'C') {
        points.push(cmd.controlPoint1, cmd.controlPoint2);
      }

      for (const pt of points) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const diagonal = Math.sqrt(width * width + height * height);
  const radius = diagonal / 2;
  const aspectRatio = width / (height || 1);

  return { centerX, centerY, width, height, radius, aspectRatio };
}

// ============================================================================
// SPHERE MAPPING
// ============================================================================

/**
 * Map 2D point to 3D sphere surface.
 * Uses a "bulge" approach where center maps to front of sphere.
 */
function mapToSphere(
  x: number,
  y: number,
  bounds: ShapeBounds,
  radiusMultiplier: number = 1.0
): Point3D {
  const radius = bounds.radius * radiusMultiplier;
  
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  const maxAngle = Math.PI / 3; // 60 degrees
  
  const theta = normalizedX * maxAngle;
  const phi = normalizedY * maxAngle;
  
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  return {
    x: radius * sinTheta * cosPhi,
    y: radius * sinPhi,
    z: radius * cosTheta * cosPhi,
  };
}

// ============================================================================
// CYLINDER MAPPING
// ============================================================================

/**
 * Map 2D point to 3D cylinder surface.
 * X maps to angle around cylinder, Y maps to height.
 */
function mapToCylinder(
  x: number,
  y: number,
  bounds: ShapeBounds,
  radiusMultiplier: number = 1.0,
  heightMultiplier: number = 1.0
): Point3D {
  const radius = bounds.radius * radiusMultiplier;
  
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  // Map X to angle (limited to front half of cylinder for visibility)
  const maxAngle = Math.PI / 2; // 90 degrees each side
  const theta = normalizedX * maxAngle;
  
  // Map Y directly to height on cylinder
  const height = normalizedY * bounds.height * heightMultiplier / 2;
  
  return {
    x: radius * Math.sin(theta),
    y: height,
    z: radius * Math.cos(theta),
  };
}

// ============================================================================
// TORUS MAPPING
// ============================================================================

/**
 * Map 2D point to 3D torus surface.
 * X maps to major angle (around the ring), Y maps to minor angle (around the tube).
 */
function mapToTorus(
  x: number,
  y: number,
  bounds: ShapeBounds,
  majorRadius: number = 1.5,
  minorRadius: number = 0.5
): Point3D {
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  // Scale radii based on bounds
  const scaledMajorRadius = bounds.radius * majorRadius;
  const scaledMinorRadius = bounds.radius * minorRadius;
  
  // Map to angles
  const maxAngle = Math.PI / 2; // 90 degrees each side
  const theta = normalizedX * maxAngle; // Major angle (around ring)
  const phi = normalizedY * maxAngle;   // Minor angle (around tube)
  
  // Torus parametric equations
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  return {
    x: (scaledMajorRadius + scaledMinorRadius * cosPhi) * sinTheta,
    y: scaledMinorRadius * sinPhi,
    z: (scaledMajorRadius + scaledMinorRadius * cosPhi) * cosTheta,
  };
}

// ============================================================================
// CONE MAPPING
// ============================================================================

/**
 * Map 2D point to 3D cone surface.
 * X maps to angle around cone, Y maps to position along height (with radius decreasing).
 */
function mapToCone(
  x: number,
  y: number,
  bounds: ShapeBounds,
  baseRadiusMultiplier: number = 1.0,
  heightMultiplier: number = 1.5
): Point3D {
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  const baseRadius = bounds.radius * baseRadiusMultiplier;
  const coneHeight = bounds.height * heightMultiplier;
  
  // Map X to angle
  const maxAngle = Math.PI / 2;
  const theta = normalizedX * maxAngle;
  
  // Map Y to height (0 at center, positive up, negative down)
  // Radius decreases linearly as we go up
  const heightPosition = normalizedY; // -1 to 1
  const height = heightPosition * coneHeight / 2;
  
  // Radius decreases from bottom to top
  // At normalizedY = -1 (bottom): full radius
  // At normalizedY = 1 (top): zero radius
  const radiusAtHeight = baseRadius * (1 - (heightPosition + 1) / 2);
  
  return {
    x: radiusAtHeight * Math.sin(theta),
    y: height,
    z: radiusAtHeight * Math.cos(theta),
  };
}

// ============================================================================
// ELLIPSOID MAPPING
// ============================================================================

/**
 * Map 2D point to 3D ellipsoid surface.
 * Similar to sphere but with independent radii for each axis.
 */
function mapToEllipsoid(
  x: number,
  y: number,
  bounds: ShapeBounds,
  radiusX: number = 1.0,
  radiusY: number = 1.5,
  radiusZ: number = 1.0
): Point3D {
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  // Scale radii based on bounds
  const scaledRadiusX = bounds.radius * radiusX;
  const scaledRadiusY = bounds.radius * radiusY;
  const scaledRadiusZ = bounds.radius * radiusZ;
  
  const maxAngle = Math.PI / 3; // 60 degrees
  
  const theta = normalizedX * maxAngle;
  const phi = normalizedY * maxAngle;
  
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  return {
    x: scaledRadiusX * sinTheta * cosPhi,
    y: scaledRadiusY * sinPhi,
    z: scaledRadiusZ * cosTheta * cosPhi,
  };
}

// ============================================================================
// WAVE SURFACE MAPPING
// ============================================================================

/**
 * Map 2D point to 3D wave surface.
 * Creates a cloth-like undulating surface using sinusoidal waves.
 */
function mapToWave(
  x: number,
  y: number,
  bounds: ShapeBounds,
  amplitudeX: number = 0.3,
  amplitudeY: number = 0.3,
  frequencyX: number = 2.0,
  frequencyY: number = 2.0,
  phaseX: number = 0,
  phaseY: number = 0
): Point3D {
  const maxDimension = Math.max(bounds.width, bounds.height);
  const normalizedX = (x - bounds.centerX) / (maxDimension / 2);
  const normalizedY = (y - bounds.centerY) / (maxDimension / 2);
  
  // Scale amplitude based on bounds
  const scaledAmplitudeX = bounds.radius * amplitudeX;
  const scaledAmplitudeY = bounds.radius * amplitudeY;
  
  // Calculate wave displacement in Z
  const waveX = scaledAmplitudeX * Math.sin(normalizedX * frequencyX * Math.PI + phaseX);
  const waveY = scaledAmplitudeY * Math.sin(normalizedY * frequencyY * Math.PI + phaseY);
  const z = waveX + waveY;
  
  // Keep X and Y relatively flat, with wave in Z
  return {
    x: (x - bounds.centerX),
    y: (y - bounds.centerY),
    z: z,
  };
}

// ============================================================================
// ROTATION AND PROJECTION
// ============================================================================

/**
 * Rotate a 3D point using Euler angles (in degrees)
 * Order: X -> Y -> Z (extrinsic rotations)
 */
function rotatePoint3D(
  point: Point3D,
  rotationX: number,
  rotationY: number,
  rotationZ: number
): Point3D {
  const rx = (rotationX * Math.PI) / 180;
  const ry = (rotationY * Math.PI) / 180;
  const rz = (rotationZ * Math.PI) / 180;

  let { x, y, z } = point;

  // Rotation around X axis
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;
  y = y1;
  z = z1;

  // Rotation around Y axis
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = x * cosY + z * sinY;
  const z2 = -x * sinY + z * cosY;
  x = x2;
  z = z2;

  // Rotation around Z axis
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x * cosZ - y * sinZ;
  const y3 = x * sinZ + y * cosZ;
  x = x3;
  y = y3;

  return { x, y, z };
}

/**
 * Project 3D point back to 2D using orthographic projection
 */
function projectToScreen(
  point3D: Point3D,
  bounds: ShapeBounds
): Point {
  return {
    x: bounds.centerX + point3D.x,
    y: bounds.centerY + point3D.y,
  };
}

/**
 * Transform a single 2D point through the 3D projection pipeline
 */
function projectPointToShape(
  point: Point,
  bounds: ShapeBounds,
  shapeType: ShapeType,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  params: ShapeParams
): Point {
  let point3D: Point3D;
  
  switch (shapeType) {
    case 'sphere':
      point3D = mapToSphere(point.x, point.y, bounds, params.radiusMultiplier);
      break;
    case 'cylinder':
      point3D = mapToCylinder(point.x, point.y, bounds, params.radiusMultiplier, params.cylinderHeight);
      break;
    case 'torus':
      point3D = mapToTorus(point.x, point.y, bounds, params.torusMajorRadius, params.torusMinorRadius);
      break;
    case 'cone':
      point3D = mapToCone(point.x, point.y, bounds, params.coneBaseRadius, params.coneHeight);
      break;
    case 'ellipsoid':
      point3D = mapToEllipsoid(
        point.x, point.y, bounds,
        params.ellipsoidRadiusX, params.ellipsoidRadiusY, params.ellipsoidRadiusZ
      );
      break;
    case 'wave':
      point3D = mapToWave(
        point.x, point.y, bounds,
        params.waveAmplitudeX, params.waveAmplitudeY,
        params.waveFrequencyX, params.waveFrequencyY,
        params.wavePhaseX, params.wavePhaseY
      );
      break;
    default:
      point3D = mapToSphere(point.x, point.y, bounds, params.radiusMultiplier);
  }
  
  const rotated3D = rotatePoint3D(point3D, rotationX, rotationY, rotationZ);
  return projectToScreen(rotated3D, bounds);
}

/**
 * Create a control point with the required metadata
 */
function createControlPoint(
  point: Point,
  anchor: Point,
  commandIndex: number,
  pointIndex: number
): ControlPoint {
  return {
    x: point.x,
    y: point.y,
    commandIndex,
    pointIndex,
    anchor,
    isControl: true,
  };
}

/**
 * Transform entire path data to 3D shape projection
 */
export function transformPathDataToShape(
  pathData: PathData,
  shapeType: ShapeType,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  params: ShapeParams,
  precomputedBounds?: ShapeBounds
): PathData | null {
  try {
    const bounds = precomputedBounds ?? calculatePathBounds(pathData);
    
    const transform = (pt: Point): Point => {
      return projectPointToShape(
        pt,
        bounds,
        shapeType,
        rotationX,
        rotationY,
        rotationZ,
        params
      );
    };

    const newSubPaths: SubPath[] = pathData.subPaths.map((subPath) => {
      return subPath.map((cmd, cmdIndex): Command => {
        switch (cmd.type) {
          case 'M': {
            const newPos = transform(cmd.position);
            return {
              type: 'M',
              position: newPos,
            };
          }
          case 'L': {
            const newPos = transform(cmd.position);
            return {
              type: 'L',
              position: newPos,
            };
          }
          case 'C': {
            const newPos = transform(cmd.position);
            const newCp1 = transform(cmd.controlPoint1);
            const newCp2 = transform(cmd.controlPoint2);
            return {
              type: 'C',
              controlPoint1: createControlPoint(newCp1, newPos, cmdIndex, 0),
              controlPoint2: createControlPoint(newCp2, newPos, cmdIndex, 1),
              position: newPos,
            };
          }
          case 'Z': {
            return { type: 'Z' };
          }
          default:
            return cmd;
        }
      });
    });

    return {
      ...pathData,
      subPaths: newSubPaths,
    };
  } catch (error) {
    console.error('Error transforming path to shape:', error);
    return null;
  }
}

/**
 * Get default shape parameters
 */
export function getDefaultShapeParams(radiusMultiplier: number = 1.0): ShapeParams {
  return {
    radiusMultiplier,
    cylinderHeight: 1.0,
    torusMajorRadius: 1.5,
    torusMinorRadius: 0.5,
    coneBaseRadius: 1.0,
    coneHeight: 1.5,
    ellipsoidRadiusX: 1.0,
    ellipsoidRadiusY: 1.5,
    ellipsoidRadiusZ: 1.0,
    waveAmplitudeX: 0.3,
    waveAmplitudeY: 0.3,
    waveFrequencyX: 2.0,
    waveFrequencyY: 2.0,
    wavePhaseX: 0,
    wavePhaseY: 0,
  };
}
