import type { Point, SubPath, ControlPoint } from '../../types';
import type { SpiralGeneratorState, SpiralType } from './slice';

/**
 * Golden ratio for Fibonacci spiral calculations.
 */
const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Compute the radius at a given angle for different spiral types.
 */
function spiralRadius(
  type: SpiralType,
  theta: number,
  maxR: number,
  minR: number,
  growthRate: number,
  totalAngle: number
): number {
  const t = theta / totalAngle; // 0 to 1

  switch (type) {
    case 'archimedean':
      // r = a + b*theta — linear growth
      return minR + (maxR - minR) * t;

    case 'logarithmic':
      // r = a * e^(b*theta) — exponential growth
      if (growthRate <= 0) return minR + (maxR - minR) * t;
      return minR + (maxR - minR) * (Math.exp(growthRate * theta) - 1) / (Math.exp(growthRate * totalAngle) - 1);

    case 'fibonacci':
      // Approximate golden spiral: r grows as PHI^(theta/(pi/2))
      return minR + (maxR - minR) * (Math.pow(PHI, (2 * theta) / Math.PI) - 1) / (Math.pow(PHI, (2 * totalAngle) / Math.PI) - 1);

    case 'fermat':
      // r = a * sqrt(theta) — Fermat spiral
      return minR + (maxR - minR) * Math.sqrt(t);
  }
}

/**
 * Build a ControlPoint from a plain Point.
 */
function makeCP(p: Point, anchor: Point): ControlPoint {
  return {
    x: p.x,
    y: p.y,
    commandIndex: 0,
    pointIndex: 0,
    anchor,
    isControl: true,
  };
}

/**
 * Generate a spiral as a SubPath of smooth cubic bezier curves.
 */
export function generateSpiral(state: SpiralGeneratorState): SubPath[] {
  const {
    spiralType,
    turns,
    outerRadius,
    innerRadius,
    pointsPerTurn,
    growthRate,
    clockwise,
    centerX,
    centerY,
  } = state;

  const totalPoints = Math.max(4, Math.round(turns * pointsPerTurn));
  const totalAngle = turns * 2 * Math.PI;
  const dir = clockwise ? 1 : -1;

  // Generate spiral points
  const points: Point[] = [];
  for (let i = 0; i <= totalPoints; i++) {
    const theta = (i / totalPoints) * totalAngle;
    const r = spiralRadius(spiralType, theta, outerRadius, innerRadius, growthRate, totalAngle);
    points.push({
      x: centerX + r * Math.cos(dir * theta),
      y: centerY + r * Math.sin(dir * theta),
    });
  }

  if (points.length < 2) return [];

  // Convert points to smooth cubic bezier commands using Catmull-Rom approximation
  const commands: SubPath = [{ type: 'M', position: points[0] }];

  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];

    // Catmull-Rom to Bezier conversion
    const tension = 6; // Higher = smoother
    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) / tension,
      y: p1.y + (p2.y - p0.y) / tension,
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) / tension,
      y: p2.y - (p3.y - p1.y) / tension,
    };

    commands.push({
      type: 'C',
      controlPoint1: makeCP(cp1, p1),
      controlPoint2: makeCP(cp2, p2),
      position: p2,
    });
  }

  return [commands];
}
