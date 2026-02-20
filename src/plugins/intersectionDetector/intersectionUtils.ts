import type { CanvasElement, SubPath, Command } from '../../types';
import type { IntersectionPoint } from './slice';

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  elementId: string;
  label: string;
}

/**
 * Flatten path element into line segments by linearizing curves.
 */
function flattenPathToSegments(el: CanvasElement, steps = 8): Segment[] {
  if (el.type !== 'path') return [];
  const segments: Segment[] = [];
  const label = el.id.slice(0, 8);

  for (const sp of el.data.subPaths as SubPath[]) {
    const cmds = sp as Command[];
    for (let i = 1; i < cmds.length; i++) {
      const prev = cmds[i - 1];
      const curr = cmds[i];

      if (prev.type === 'Z' || curr.type === 'Z') continue;

      if (curr.type === 'C') {
        // Approximate cubic Bezier with line segments
        const p0 = prev.position;
        const p1 = curr.controlPoint1;
        const p2 = curr.controlPoint2;
        const p3 = curr.position;

        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;
          const ax = cubicBezier(p0.x, p1.x, p2.x, p3.x, t0);
          const ay = cubicBezier(p0.y, p1.y, p2.y, p3.y, t0);
          const bx = cubicBezier(p0.x, p1.x, p2.x, p3.x, t1);
          const by = cubicBezier(p0.y, p1.y, p2.y, p3.y, t1);
          segments.push({ x1: ax, y1: ay, x2: bx, y2: by, elementId: el.id, label });
        }
      } else {
        // Line or Move segment
        segments.push({
          x1: prev.position.x, y1: prev.position.y,
          x2: curr.position.x, y2: curr.position.y,
          elementId: el.id, label,
        });
      }
    }
  }

  return segments;
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/**
 * Line segment intersection test. Returns intersection point or null.
 */
function segmentIntersection(
  a: Segment, b: Segment
): { x: number; y: number } | null {
  const dx1 = a.x2 - a.x1;
  const dy1 = a.y2 - a.y1;
  const dx2 = b.x2 - b.x1;
  const dy2 = b.y2 - b.y1;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((b.x1 - a.x1) * dy2 - (b.y1 - a.y1) * dx2) / denom;
  const u = ((b.x1 - a.x1) * dy1 - (b.y1 - a.y1) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: Math.round((a.x1 + t * dx1) * 100) / 100,
      y: Math.round((a.y1 + t * dy1) * 100) / 100,
    };
  }

  return null;
}

/**
 * Remove duplicate intersection points within tolerance.
 */
function deduplicatePoints(points: IntersectionPoint[], tolerance: number): IntersectionPoint[] {
  const result: IntersectionPoint[] = [];
  const tolSq = tolerance * tolerance;

  for (const p of points) {
    const isDuplicate = result.some(
      (r) => (r.x - p.x) ** 2 + (r.y - p.y) ** 2 < tolSq
        && r.elementIdA === p.elementIdA && r.elementIdB === p.elementIdB
    );
    if (!isDuplicate) result.push(p);
  }

  return result;
}

export function detectIntersections(
  elements: CanvasElement[],
  tolerance: number,
  includeSelfIntersections: boolean
): IntersectionPoint[] {
  const allSegments: Map<string, Segment[]> = new Map();

  for (const el of elements) {
    if (el.type !== 'path') continue;
    const segs = flattenPathToSegments(el);
    if (segs.length > 0) {
      allSegments.set(el.id, segs);
    }
  }

  const intersections: IntersectionPoint[] = [];
  const ids = Array.from(allSegments.keys());

  // Cross-element intersections
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const segsA = allSegments.get(ids[i])!;
      const segsB = allSegments.get(ids[j])!;

      for (const a of segsA) {
        for (const b of segsB) {
          const pt = segmentIntersection(a, b);
          if (pt) {
            intersections.push({
              ...pt,
              elementIdA: a.elementId,
              elementIdB: b.elementId,
              labelA: a.label,
              labelB: b.label,
            });
          }
        }
      }
    }

    // Self-intersections
    if (includeSelfIntersections) {
      const segs = allSegments.get(ids[i])!;
      for (let m = 0; m < segs.length; m++) {
        for (let n = m + 2; n < segs.length; n++) {
          const pt = segmentIntersection(segs[m], segs[n]);
          if (pt) {
            intersections.push({
              ...pt,
              elementIdA: segs[m].elementId,
              elementIdB: segs[n].elementId,
              labelA: segs[m].label + ' (self)',
              labelB: segs[n].label + ' (self)',
            });
          }
        }
      }
    }
  }

  return deduplicatePoints(intersections, tolerance);
}
