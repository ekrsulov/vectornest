import type { SubPath, Point } from '../../types';

export interface PathMetrics {
  totalLength: number;
  nodeCount: number;
  subPathCount: number;
  lineSegments: number;
  curveSegments: number;
  moveCommands: number;
  closeCommands: number;
  estimatedArea: number;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

export interface SegmentInfo {
  type: 'M' | 'L' | 'C' | 'Z';
  start: Point;
  end: Point;
  length: number;
  midpoint: Point;
}

/** Approximate length of a cubic bezier via sampling */
function cubicLength(p0: Point, p1: Point, p2: Point, p3: Point, samples: number = 20): number {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const pt: Point = {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    len += Math.sqrt(dx * dx + dy * dy);
    prev = pt;
  }
  return len;
}

/** Midpoint of a cubic bezier (at t=0.5) */
function cubicMidpoint(p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const t = 0.5;
  const u = 0.5;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Line segment length */
function lineLength(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Estimate signed area using the shoelace formula on sampled points */
function estimateArea(subPaths: SubPath[]): number {
  let area = 0;

  for (const sp of subPaths) {
    const pts: Point[] = [];
    let currentPos: Point = { x: 0, y: 0 };

    for (const cmd of sp) {
      if (cmd.type === 'M') {
        currentPos = cmd.position;
        pts.push(currentPos);
      } else if (cmd.type === 'L') {
        pts.push(cmd.position);
        currentPos = cmd.position;
      } else if (cmd.type === 'C') {
        // Sample curve
        for (let i = 1; i <= 10; i++) {
          const t = i / 10;
          const u = 1 - t;
          pts.push({
            x: u * u * u * currentPos.x + 3 * u * u * t * cmd.controlPoint1.x +
               3 * u * t * t * cmd.controlPoint2.x + t * t * t * cmd.position.x,
            y: u * u * u * currentPos.y + 3 * u * u * t * cmd.controlPoint1.y +
               3 * u * t * t * cmd.controlPoint2.y + t * t * t * cmd.position.y,
          });
        }
        currentPos = cmd.position;
      }
    }

    // Shoelace formula
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
  }

  return Math.abs(area) / 2;
}

/** Analyze path and compute metrics */
export function analyzePathAnatomy(subPaths: SubPath[]): PathMetrics {
  let totalLength = 0;
  let nodeCount = 0;
  let lineSegments = 0;
  let curveSegments = 0;
  let moveCommands = 0;
  let closeCommands = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const sp of subPaths) {
    let currentPos: Point = { x: 0, y: 0 };

    for (const cmd of sp) {
      if (cmd.type === 'M') {
        moveCommands++;
        nodeCount++;
        currentPos = cmd.position;
        minX = Math.min(minX, cmd.position.x);
        minY = Math.min(minY, cmd.position.y);
        maxX = Math.max(maxX, cmd.position.x);
        maxY = Math.max(maxY, cmd.position.y);
      } else if (cmd.type === 'L') {
        lineSegments++;
        nodeCount++;
        totalLength += lineLength(currentPos, cmd.position);
        currentPos = cmd.position;
        minX = Math.min(minX, cmd.position.x);
        minY = Math.min(minY, cmd.position.y);
        maxX = Math.max(maxX, cmd.position.x);
        maxY = Math.max(maxY, cmd.position.y);
      } else if (cmd.type === 'C') {
        curveSegments++;
        nodeCount++;
        totalLength += cubicLength(currentPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position);
        minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
        minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
        maxX = Math.max(maxX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
        maxY = Math.max(maxY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
        currentPos = cmd.position;
      } else if (cmd.type === 'Z') {
        closeCommands++;
      }
    }
  }

  const bbox = minX === Infinity ? null : { minX, minY, maxX, maxY };

  return {
    totalLength,
    nodeCount,
    subPathCount: subPaths.length,
    lineSegments,
    curveSegments,
    moveCommands,
    closeCommands,
    estimatedArea: estimateArea(subPaths),
    boundingBox: bbox,
  };
}

/** Get per-segment info for overlay rendering */
export function getSegmentInfos(subPaths: SubPath[]): SegmentInfo[] {
  const segments: SegmentInfo[] = [];

  for (const sp of subPaths) {
    let currentPos: Point = { x: 0, y: 0 };
    let subPathStart: Point = { x: 0, y: 0 };

    for (const cmd of sp) {
      if (cmd.type === 'M') {
        currentPos = cmd.position;
        subPathStart = cmd.position;
      } else if (cmd.type === 'L') {
        const mid: Point = {
          x: (currentPos.x + cmd.position.x) / 2,
          y: (currentPos.y + cmd.position.y) / 2,
        };
        segments.push({
          type: 'L',
          start: currentPos,
          end: cmd.position,
          length: lineLength(currentPos, cmd.position),
          midpoint: mid,
        });
        currentPos = cmd.position;
      } else if (cmd.type === 'C') {
        const len = cubicLength(currentPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position);
        const mid = cubicMidpoint(currentPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position);
        segments.push({
          type: 'C',
          start: currentPos,
          end: cmd.position,
          length: len,
          midpoint: mid,
        });
        currentPos = cmd.position;
      } else if (cmd.type === 'Z') {
        if (currentPos.x !== subPathStart.x || currentPos.y !== subPathStart.y) {
          const len = lineLength(currentPos, subPathStart);
          segments.push({
            type: 'Z',
            start: currentPos,
            end: subPathStart,
            length: len,
            midpoint: {
              x: (currentPos.x + subPathStart.x) / 2,
              y: (currentPos.y + subPathStart.y) / 2,
            },
          });
        }
        currentPos = subPathStart;
      }
    }
  }

  return segments;
}
