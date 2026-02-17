import type { Point } from '../types';

export interface SegmentProjectionResult {
  closestPoint: Point;
  t: number;
  distanceSquared: number;
}

export function projectPointOntoSegment(
  point: Point,
  start: Point,
  end: Point
): SegmentProjectionResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const diffX = point.x - start.x;
    const diffY = point.y - start.y;
    return {
      closestPoint: start,
      t: 0,
      distanceSquared: diffX * diffX + diffY * diffY,
    };
  }

  const unclampedT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, unclampedT));
  const closestPoint = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };
  const diffX = point.x - closestPoint.x;
  const diffY = point.y - closestPoint.y;

  return {
    closestPoint,
    t,
    distanceSquared: diffX * diffX + diffY * diffY,
  };
}
