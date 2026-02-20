import type { Point, SubPath, Command, ControlPoint, PathData } from '../../types';
import type { StitchStyle } from './slice';

function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

/**
 * Interpolate between two points.
 */
function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Get the perpendicular direction to a line from a to b.
 */
function perp(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-10) return { x: 0, y: -1 };
  return { x: -dy / len, y: dx / len };
}

/**
 * Get the first M position from a subpath array.
 */
function getFirstPoint(subPaths: SubPath[]): Point | null {
  for (const sp of subPaths) {
    for (const cmd of sp) {
      if (cmd.type === 'M') return cmd.position;
    }
  }
  return null;
}

/**
 * Get the last position from a subpath array.
 */
function getLastPoint(subPaths: SubPath[]): Point | null {
  for (let i = subPaths.length - 1; i >= 0; i--) {
    for (let j = subPaths[i].length - 1; j >= 0; j--) {
      const cmd = subPaths[i][j];
      if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C') {
        return cmd.position;
      }
    }
  }
  return null;
}

/**
 * Compute the centroid of all points in a path.
 */
function getCentroid(subPaths: SubPath[]): Point {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const sp of subPaths) {
    for (const cmd of sp) {
      if (cmd.type !== 'Z') {
        sumX += cmd.position.x;
        sumY += cmd.position.y;
        count++;
      }
    }
  }
  return count > 0 ? { x: sumX / count, y: sumY / count } : { x: 0, y: 0 };
}

/**
 * Find the nearest pair of endpoints between two paths.
 */
function nearestEndpoints(
  pathA: PathData,
  pathB: PathData
): { from: Point; to: Point } {
  const pointsA = [getFirstPoint(pathA.subPaths), getLastPoint(pathA.subPaths)].filter(Boolean) as Point[];
  const pointsB = [getFirstPoint(pathB.subPaths), getLastPoint(pathB.subPaths)].filter(Boolean) as Point[];

  let bestDist = Infinity;
  let bestFrom = pointsA[0] || { x: 0, y: 0 };
  let bestTo = pointsB[0] || { x: 0, y: 0 };

  for (const a of pointsA) {
    for (const b of pointsB) {
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestFrom = a;
        bestTo = b;
      }
    }
  }
  return { from: bestFrom, to: bestTo };
}

/**
 * Generate zigzag stitch pattern between two points.
 */
function zigzagStitch(from: Point, to: Point, width: number, density: number): SubPath {
  const n = perp(from, to);
  const cmds: Command[] = [{ type: 'M', position: from }];

  for (let i = 1; i <= density; i++) {
    const t = i / density;
    const mid = lerp(from, to, t);
    const side = i % 2 === 0 ? 1 : -1;
    cmds.push({
      type: 'L',
      position: { x: mid.x + n.x * width * side, y: mid.y + n.y * width * side },
    });
  }

  cmds.push({ type: 'L', position: to });
  return cmds;
}

/**
 * Generate wave stitch pattern.
 */
function waveStitch(from: Point, to: Point, width: number, density: number): SubPath {
  const n = perp(from, to);
  const cmds: Command[] = [{ type: 'M', position: from }];

  for (let i = 1; i <= density; i++) {
    const t = i / density;
    const pt = lerp(from, to, t);
    const prevT = (i - 1) / density;
    const prevPt = lerp(from, to, prevT);
    const side = Math.sin((i * Math.PI) / 2);

    const cp1 = {
      x: prevPt.x + (pt.x - prevPt.x) * 0.5 + n.x * width * side,
      y: prevPt.y + (pt.y - prevPt.y) * 0.5 + n.y * width * side,
    };
    const cp2 = {
      x: prevPt.x + (pt.x - prevPt.x) * 0.5 + n.x * width * side,
      y: prevPt.y + (pt.y - prevPt.y) * 0.5 + n.y * width * side,
    };

    cmds.push({
      type: 'C',
      controlPoint1: makeCP(cp1, pt),
      controlPoint2: makeCP(cp2, pt),
      position: pt,
    });
  }

  return cmds;
}

/**
 * Generate cross stitch pattern (X shapes).
 */
function crossStitch(from: Point, to: Point, width: number, density: number, spacing: number): SubPath[] {
  const n = perp(from, to);
  const subPaths: SubPath[] = [];
  const step = 1 / Math.max(1, density);

  for (let i = 0; i < density; i++) {
    const t = (i + 0.5) * step;
    const mid = lerp(from, to, t);
    const halfW = width / 2;
    const halfS = (spacing * step) / 4;

    // Forward slash
    const dir = { x: to.x - from.x, y: to.y - from.y };
    const dirLen = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    const dNorm = dirLen > 0 ? { x: dir.x / dirLen, y: dir.y / dirLen } : { x: 1, y: 0 };

    subPaths.push([
      {
        type: 'M',
        position: {
          x: mid.x - dNorm.x * halfS + n.x * halfW,
          y: mid.y - dNorm.y * halfS + n.y * halfW,
        },
      },
      {
        type: 'L',
        position: {
          x: mid.x + dNorm.x * halfS - n.x * halfW,
          y: mid.y + dNorm.y * halfS - n.y * halfW,
        },
      },
    ]);

    // Back slash
    subPaths.push([
      {
        type: 'M',
        position: {
          x: mid.x + dNorm.x * halfS + n.x * halfW,
          y: mid.y + dNorm.y * halfS + n.y * halfW,
        },
      },
      {
        type: 'L',
        position: {
          x: mid.x - dNorm.x * halfS - n.x * halfW,
          y: mid.y - dNorm.y * halfS - n.y * halfW,
        },
      },
    ]);
  }

  return subPaths;
}

/**
 * Generate running stitch (dashed line).
 */
function runningStitch(from: Point, to: Point, density: number, spacing: number): SubPath[] {
  const subPaths: SubPath[] = [];
  const totalSteps = density * 2;
  const step = 1 / totalSteps;

  for (let i = 0; i < density; i++) {
    const t0 = i * 2 * step;
    const t1 = t0 + step * (1 - spacing / 20);
    subPaths.push([
      { type: 'M', position: lerp(from, to, t0) },
      { type: 'L', position: lerp(from, to, Math.min(t1, 1)) },
    ]);
  }

  return subPaths;
}

/**
 * Generate chain stitch (linked loops).
 */
function chainStitch(from: Point, to: Point, width: number, density: number): SubPath[] {
  const n = perp(from, to);
  const subPaths: SubPath[] = [];
  const step = 1 / density;

  for (let i = 0; i < density; i++) {
    const t0 = i * step;
    const t1 = (i + 1) * step;
    const p0 = lerp(from, to, t0);
    const p1 = lerp(from, to, t1);
    const mid = lerp(p0, p1, 0.5);

    // Create an oval loop
    const cpOff = width * 0.6;
    subPaths.push([
      { type: 'M', position: p0 },
      {
        type: 'C',
        controlPoint1: makeCP({ x: mid.x + n.x * cpOff, y: mid.y + n.y * cpOff }, p1),
        controlPoint2: makeCP({ x: mid.x + n.x * cpOff, y: mid.y + n.y * cpOff }, p1),
        position: p1,
      },
      {
        type: 'C',
        controlPoint1: makeCP({ x: mid.x - n.x * cpOff, y: mid.y - n.y * cpOff }, p0),
        controlPoint2: makeCP({ x: mid.x - n.x * cpOff, y: mid.y - n.y * cpOff }, p0),
        position: p0,
      },
      { type: 'Z' },
    ]);
  }

  return subPaths;
}

/**
 * Generate spiral stitch connection.
 */
function spiralStitch(from: Point, to: Point, width: number, density: number): SubPath {
  const n = perp(from, to);
  const cmds: Command[] = [{ type: 'M', position: from }];
  const totalPoints = density * 4;

  for (let i = 1; i <= totalPoints; i++) {
    const t = i / totalPoints;
    const pt = lerp(from, to, t);
    const angle = t * density * Math.PI * 2;
    const radius = width * (1 - Math.abs(t - 0.5) * 2) * 0.5;

    cmds.push({
      type: 'L',
      position: {
        x: pt.x + n.x * Math.cos(angle) * radius,
        y: pt.y + n.y * Math.cos(angle) * radius + Math.sin(angle) * radius,
      },
    });
  }

  cmds.push({ type: 'L', position: to });
  return cmds;
}

/**
 * Generate stitch connection between two paths.
 */
export function generateStitch(
  pathA: PathData,
  pathB: PathData,
  style: StitchStyle,
  stitchWidth: number,
  spacing: number,
  density: number,
  connectionMode: 'endpoints' | 'centroids'
): SubPath[] {
  let from: Point;
  let to: Point;

  if (connectionMode === 'endpoints') {
    const pair = nearestEndpoints(pathA, pathB);
    from = pair.from;
    to = pair.to;
  } else {
    from = getCentroid(pathA.subPaths);
    to = getCentroid(pathB.subPaths);
  }

  switch (style) {
    case 'zigzag':
      return [zigzagStitch(from, to, stitchWidth, density)];
    case 'wave':
      return [waveStitch(from, to, stitchWidth, density)];
    case 'cross':
      return crossStitch(from, to, stitchWidth, density, spacing);
    case 'running':
      return runningStitch(from, to, density, spacing);
    case 'chain':
      return chainStitch(from, to, stitchWidth, density);
    case 'spiral':
      return [spiralStitch(from, to, stitchWidth, density)];
  }
}
