import type { Point, SubPath, Command, ControlPoint, PathData } from '../../types';

/**
 * Flatten a subpath to a polyline of evenly-spaced sample points.
 */
function flattenToPolyline(sp: SubPath, samplesPerSegment = 8): Point[] {
  const pts: Point[] = [];
  let current: Point = { x: 0, y: 0 };

  for (const cmd of sp) {
    switch (cmd.type) {
      case 'M':
        current = cmd.position;
        pts.push(current);
        break;
      case 'L':
        current = cmd.position;
        pts.push(current);
        break;
      case 'C': {
        const p0 = current;
        for (let i = 1; i <= samplesPerSegment; i++) {
          const t = i / samplesPerSegment;
          const mt = 1 - t;
          pts.push({
            x: mt * mt * mt * p0.x + 3 * mt * mt * t * cmd.controlPoint1.x +
               3 * mt * t * t * cmd.controlPoint2.x + t * t * t * cmd.position.x,
            y: mt * mt * mt * p0.y + 3 * mt * mt * t * cmd.controlPoint1.y +
               3 * mt * t * t * cmd.controlPoint2.y + t * t * t * cmd.position.y,
          });
        }
        current = cmd.position;
        break;
      }
      case 'Z':
        if (pts.length > 0) {
          pts.push(pts[0]);
          current = pts[0];
        }
        break;
    }
  }
  return pts;
}

/**
 * Find intersection point between two line segments (p1-p2) and (p3-p4).
 * Returns null if no intersection or if segments are parallel.
 */
function segmentIntersection(
  p1: Point, p2: Point, p3: Point, p4: Point
): { point: Point; t1: number; t2: number } | null {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;

  const t1 = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom;
  const t2 = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom;

  if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) return null;

  return {
    point: { x: p1.x + t1 * dx1, y: p1.y + t1 * dy1 },
    t1,
    t2,
  };
}

interface Intersection {
  point: Point;
  /** Global parametric position along polyline A (0-1) */
  tA: number;
  /** Global parametric position along polyline B (0-1) */
  tB: number;
}

/**
 * Find all intersections between two polylines.
 */
function findPolylineIntersections(polyA: Point[], polyB: Point[]): Intersection[] {
  const results: Intersection[] = [];

  for (let i = 0; i < polyA.length - 1; i++) {
    for (let j = 0; j < polyB.length - 1; j++) {
      const hit = segmentIntersection(polyA[i], polyA[i + 1], polyB[j], polyB[j + 1]);
      if (hit) {
        // Global t along the polyline
        const tA = (i + hit.t1) / (polyA.length - 1);
        const tB = (j + hit.t2) / (polyB.length - 1);
        results.push({ point: hit.point, tA, tB });
      }
    }
  }

  // Sort by tA
  results.sort((a, b) => a.tA - b.tA);
  return results;
}

/**
 * Build a ControlPoint from a Point.
 */
function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

/**
 * Interpolate a point on a polyline at a global t value.
 */
function polylinePointAt(poly: Point[], globalT: number): Point {
  const idx = globalT * (poly.length - 1);
  const i = Math.min(Math.floor(idx), poly.length - 2);
  const frac = idx - i;
  return {
    x: poly[i].x + (poly[i + 1].x - poly[i].x) * frac,
    y: poly[i].y + (poly[i + 1].y - poly[i].y) * frac,
  };
}

/**
 * Split a subpath at intersection points and create gaps for the "under" portions.
 * Returns a new set of subpaths with gaps where the path goes under.
 */
function createWeaveSubPaths(
  originalSP: SubPath,
  poly: Point[],
  intersections: Intersection[],
  gapSize: number,
  isPathA: boolean,
  startOver: boolean,
  alternate: boolean
): SubPath[] {
  if (intersections.length === 0) return [originalSP];
  if (poly.length < 2) return [originalSP];

  // For each intersection, determine if we're "over" or "under"
  // PathA alternates starting from startOver
  // PathB is the opposite
  const gapRegions: { start: number; end: number }[] = [];

  for (let idx = 0; idx < intersections.length; idx++) {
    const isOver = alternate
      ? (idx % 2 === 0) === startOver
      : startOver;

    // If this path is under at this point, create a gap
    const isUnder = isPathA ? !isOver : isOver;
    if (isUnder) {
      const t = isPathA ? intersections[idx].tA : intersections[idx].tB;
      // Convert gap size to parametric distance
      const totalLen = polylineLength(poly);
      const halfGap = totalLen > 0 ? (gapSize / 2) / totalLen : 0;
      gapRegions.push({
        start: Math.max(0, t - halfGap),
        end: Math.min(1, t + halfGap),
      });
    }
  }

  if (gapRegions.length === 0) return [originalSP];

  // Merge overlapping gaps
  const merged = mergeRegions(gapRegions);

  // Build visible segments
  const visibleSegments: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const gap of merged) {
    if (gap.start > cursor) {
      visibleSegments.push({ start: cursor, end: gap.start });
    }
    cursor = gap.end;
  }
  if (cursor < 1) {
    visibleSegments.push({ start: cursor, end: 1 });
  }

  // Convert visible segments to subpaths
  return visibleSegments.map((seg) => {
    const samplesInSeg = Math.max(2, Math.round((seg.end - seg.start) * poly.length));
    const cmds: Command[] = [];

    for (let i = 0; i <= samplesInSeg; i++) {
      const t = seg.start + (i / samplesInSeg) * (seg.end - seg.start);
      const pt = polylinePointAt(poly, t);

      if (i === 0) {
        cmds.push({ type: 'M', position: pt });
      } else {
        // Use cubic bezier for smooth curves
        const prevT = seg.start + ((i - 1) / samplesInSeg) * (seg.end - seg.start);
        const midT1 = prevT + (t - prevT) / 3;
        const midT2 = prevT + (2 * (t - prevT)) / 3;
        const cp1 = polylinePointAt(poly, midT1);
        const cp2 = polylinePointAt(poly, midT2);
        cmds.push({
          type: 'C',
          controlPoint1: makeCP(cp1, pt),
          controlPoint2: makeCP(cp2, pt),
          position: pt,
        });
      }
    }
    return cmds;
  });
}

/**
 * Compute total length of a polyline.
 */
function polylineLength(poly: Point[]): number {
  let len = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i].x - poly[i - 1].x;
    const dy = poly[i].y - poly[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/**
 * Merge overlapping regions.
 */
function mergeRegions(regions: { start: number; end: number }[]): { start: number; end: number }[] {
  if (regions.length === 0) return [];
  const sorted = [...regions].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

/**
 * Apply weave effect between two path data objects.
 * Returns modified copies of both paths with gaps at intersections.
 */
export function applyWeave(
  pathA: PathData,
  pathB: PathData,
  gapSize: number,
  startOver: boolean,
  alternate: boolean
): { resultA: SubPath[]; resultB: SubPath[] } {
  // Flatten all subpaths
  const polyA = pathA.subPaths.flatMap((sp) => flattenToPolyline(sp));
  const polyB = pathB.subPaths.flatMap((sp) => flattenToPolyline(sp));

  if (polyA.length < 2 || polyB.length < 2) {
    return { resultA: pathA.subPaths, resultB: pathB.subPaths };
  }

  const intersections = findPolylineIntersections(polyA, polyB);

  if (intersections.length === 0) {
    return { resultA: pathA.subPaths, resultB: pathB.subPaths };
  }

  const resultA: SubPath[] = [];
  const resultB: SubPath[] = [];

  for (const sp of pathA.subPaths) {
    const poly = flattenToPolyline(sp);
    const spResults = createWeaveSubPaths(sp, poly, intersections, gapSize, true, startOver, alternate);
    resultA.push(...spResults);
  }

  for (const sp of pathB.subPaths) {
    const poly = flattenToPolyline(sp);
    const spResults = createWeaveSubPaths(sp, poly, intersections, gapSize, false, startOver, alternate);
    resultB.push(...spResults);
  }

  return { resultA, resultB };
}
