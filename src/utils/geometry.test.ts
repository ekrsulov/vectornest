import { describe, expect, it } from 'vitest';
import {
  closestPointOnCubicBezier,
  closestPointOnLineSegment,
  constrainToCardinalAndDiagonal,
  normalizeAngle,
} from './geometry';

describe('geometry', () => {
  it('normalizes angles into [-PI, PI]', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(-Math.PI);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI);
  });

  it('constrains drag vectors to cardinal/diagonal directions', () => {
    const constrained = constrainToCardinalAndDiagonal(
      { x: 0, y: 0 },
      { x: 12, y: 1 }
    );
    expect(constrained.y).toBeCloseTo(0, 4);
    expect(constrained.x).toBeGreaterThan(0);
  });

  it('returns closest point on a line segment with distance/t', () => {
    const result = closestPointOnLineSegment(
      { x: 3, y: 4 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    );

    expect(result.closestPoint.x).toBeCloseTo(3);
    expect(result.closestPoint.y).toBeCloseTo(0);
    expect(result.t).toBeCloseTo(0.3);
    expect(result.distance).toBeCloseTo(4);
  });

  it('approximates closest point on cubic bezier', () => {
    const result = closestPointOnCubicBezier(
      { x: 5, y: 2 },
      { x: 0, y: 0 },
      { x: 3.33, y: 0 },
      { x: 6.66, y: 0 },
      { x: 10, y: 0 }
    );

    expect(result.closestPoint.y).toBeCloseTo(0, 2);
    expect(result.closestPoint.x).toBeCloseTo(5, 1);
    expect(result.t).toBeGreaterThan(0);
    expect(result.t).toBeLessThan(1);
  });
});
