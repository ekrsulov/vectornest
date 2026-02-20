import type { SubPath, Command, Point } from '../../types';

export interface DirectionArrow {
  position: Point;
  angle: number; // radians
}

export interface PathEndpoints {
  start: Point | null;
  end: Point | null;
}

/** Get a point along a line at parameter t */
function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Evaluate cubic bezier at t */
function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Approximate segment length */
function segmentLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/** Sample points along a command for arrow placement */
function sampleCommand(
  cmd: Command, prevPos: Point, numSamples: number
): { points: Point[]; angles: number[] } {
  const points: Point[] = [];
  const angles: number[] = [];

  if (cmd.type === 'L') {
    const dx = cmd.position.x - prevPos.x;
    const dy = cmd.position.y - prevPos.y;
    const angle = Math.atan2(dy, dx);

    for (let i = 0; i < numSamples; i++) {
      const t = (i + 0.5) / numSamples;
      points.push(lerpPoint(prevPos, cmd.position, t));
      angles.push(angle);
    }
  } else if (cmd.type === 'C') {
    for (let i = 0; i < numSamples; i++) {
      const t = (i + 0.5) / numSamples;
      const pt = cubicAt(prevPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position, t);
      points.push(pt);

      // Tangent via finite difference
      const dt = 0.01;
      const ptNext = cubicAt(
        prevPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position,
        Math.min(1, t + dt)
      );
      angles.push(Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x));
    }
  }

  return { points, angles };
}

/** Compute direction arrows for a subpath */
export function computeDirectionArrows(
  subPath: SubPath, arrowDensity: number
): DirectionArrow[] {
  const arrows: DirectionArrow[] = [];
  let currentPos: Point = { x: 0, y: 0 };

  for (const cmd of subPath) {
    if (cmd.type === 'M') {
      currentPos = cmd.position;
      continue;
    }

    if (cmd.type === 'Z') continue;

    // Estimate segment length for arrow count
    let samplePts: Point[];
    if (cmd.type === 'L') {
      samplePts = [currentPos, cmd.position];
    } else if (cmd.type === 'C') {
      samplePts = [];
      for (let i = 0; i <= 10; i++) {
        samplePts.push(cubicAt(currentPos, cmd.controlPoint1, cmd.controlPoint2, cmd.position, i / 10));
      }
    } else {
      currentPos = (cmd as { position: Point }).position || currentPos;
      continue;
    }

    const len = segmentLength(samplePts);
    const numArrows = Math.max(1, Math.round((len / 100) * arrowDensity));
    const sampled = sampleCommand(cmd, currentPos, numArrows);

    for (let i = 0; i < sampled.points.length; i++) {
      arrows.push({ position: sampled.points[i], angle: sampled.angles[i] });
    }

    currentPos = cmd.position;
  }

  return arrows;
}

/** Get start and end points of a subpath */
export function getEndpoints(subPath: SubPath): PathEndpoints {
  let start: Point | null = null;
  let end: Point | null = null;

  for (const cmd of subPath) {
    if (cmd.type === 'M') {
      if (!start) start = cmd.position;
      end = cmd.position;
    } else if (cmd.type !== 'Z') {
      end = cmd.position;
    }
  }

  return { start, end };
}

/** Reverse a subpath so direction flows backwards */
export function reverseSubPath(subPath: SubPath): SubPath {
  if (subPath.length < 2) return [...subPath];

  const isClosed = subPath[subPath.length - 1].type === 'Z';
  const cmds = isClosed ? subPath.slice(0, -1) : [...subPath];

  // Collect positional commands
  const positions: { pos: Point; cmd: Command }[] = [];
  for (const cmd of cmds) {
    if (cmd.type !== 'Z') {
      positions.push({ pos: cmd.position, cmd });
    }
  }

  if (positions.length < 2) return [...subPath];

  const reversed: Command[] = [];
  reversed.push({ type: 'M', position: positions[positions.length - 1].pos });

  for (let i = positions.length - 1; i > 0; i--) {
    const currCmd = positions[i].cmd;
    const targetPos = positions[i - 1].pos;

    if (currCmd.type === 'C') {
      reversed.push({
        type: 'C',
        controlPoint1: { ...currCmd.controlPoint2, anchor: targetPos },
        controlPoint2: { ...currCmd.controlPoint1, anchor: targetPos },
        position: targetPos,
      });
    } else {
      reversed.push({ type: 'L', position: targetPos });
    }
  }

  if (isClosed) {
    reversed.push({ type: 'Z' });
  }

  return reversed;
}
