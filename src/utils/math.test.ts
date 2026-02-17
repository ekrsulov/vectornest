import { describe, expect, it } from 'vitest';
import {
  bezierPoint,
  closestPointOnSegment,
  distance,
  lineSegmentIntersection,
  midpoint,
} from './math';

describe('math', () => {
  it('computes distance and midpoint', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('returns segment projection clamped to [0,1]', () => {
    const projected = closestPointOnSegment(
      { x: 8, y: 4 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    );
    expect(projected.x).toBeCloseTo(8);
    expect(projected.y).toBeCloseTo(0);

    const clamped = closestPointOnSegment(
      { x: 20, y: 2 },
      { x: 0, y: 0 },
      { x: 10, y: 0 }
    );
    expect(clamped).toEqual({ x: 10, y: 0 });
  });

  it('finds line segment intersections and rejects parallels', () => {
    const hit = lineSegmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 }
    );
    expect(hit).toEqual({ x: 5, y: 5 });

    const parallel = lineSegmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 1 },
      { x: 10, y: 1 }
    );
    expect(parallel).toBeNull();
  });

  it('evaluates cubic bezier endpoints', () => {
    const p0 = { x: 1, y: 2 };
    const p1 = { x: 3, y: 4 };
    const p2 = { x: 5, y: 6 };
    const p3 = { x: 7, y: 8 };
    expect(bezierPoint(p0, p1, p2, p3, 0)).toEqual(p0);
    expect(bezierPoint(p0, p1, p2, p3, 1)).toEqual(p3);
  });
});
