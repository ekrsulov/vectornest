import { describe, expect, it } from 'vitest';
import { projectPointOntoSegment } from './segmentProjection';

describe('segmentProjection', () => {
  it('projects and clamps to segment endpoints', () => {
    const inside = projectPointOntoSegment(
      { x: 8, y: 4 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    );
    expect(inside.closestPoint).toEqual({ x: 8, y: 0 });
    expect(inside.t).toBeCloseTo(0.8);
    expect(inside.distanceSquared).toBeCloseTo(16);

    const outside = projectPointOntoSegment(
      { x: 20, y: 2 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    );
    expect(outside.closestPoint).toEqual({ x: 10, y: 0 });
    expect(outside.t).toBe(1);
    expect(outside.distanceSquared).toBeCloseTo(104);
  });
});
