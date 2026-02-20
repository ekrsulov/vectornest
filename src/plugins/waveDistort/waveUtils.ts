import type { Point, SubPath, Command, ControlPoint } from '../../types';
import type { WaveDistortState } from './slice';

/**
 * Compute wave displacement for a given t ∈ [0, 1].
 */
function waveValue(t: number, state: WaveDistortState): number {
  const phaseRad = (state.phase * Math.PI) / 180;
  const theta = t * state.frequency * 2 * Math.PI + phaseRad;
  switch (state.waveType) {
    case 'sine':
      return Math.sin(theta) * state.amplitude;
    case 'sawtooth':
      return ((((theta / (2 * Math.PI)) % 1) + 1) % 1 - 0.5) * 2 * state.amplitude;
    case 'square':
      return (Math.sin(theta) >= 0 ? 1 : -1) * state.amplitude;
    case 'triangle': {
      const p = ((((theta / (2 * Math.PI)) % 1) + 1) % 1);
      return (Math.abs(p * 4 - 2) - 1) * state.amplitude;
    }
  }
}

/**
 * Interpolate a point along a polyline at parameter t ∈ [0, 1].
 */
function interpolatePolyline(points: Point[], t: number): { point: Point; normal: Point } {
  if (points.length < 2) {
    return { point: points[0] || { x: 0, y: 0 }, normal: { x: 0, y: -1 } };
  }

  // Compute cumulative lengths
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
    lengths.push(total);
  }

  if (total < 1e-10) {
    return { point: points[0], normal: { x: 0, y: -1 } };
  }

  const targetLen = t * total;

  // Find segment
  let segIdx = 0;
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= targetLen) {
      segIdx = i - 1;
      break;
    }
    segIdx = i - 1;
  }

  const segLen = lengths[segIdx + 1] - lengths[segIdx];
  const segT = segLen > 1e-10 ? (targetLen - lengths[segIdx]) / segLen : 0;

  const a = points[segIdx];
  const b = points[segIdx + 1];

  const point: Point = {
    x: a.x + (b.x - a.x) * segT,
    y: a.y + (b.y - a.y) * segT,
  };

  // Normal: perpendicular to segment direction
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const normal: Point = len > 1e-10 ? { x: -dy / len, y: dx / len } : { x: 0, y: -1 };

  return { point, normal };
}

/**
 * Flatten a subpath into a polyline of points.
 */
function flattenSubPath(sp: SubPath): Point[] {
  const points: Point[] = [];
  for (const cmd of sp) {
    if (cmd.type === 'M' || cmd.type === 'L') {
      points.push(cmd.position);
    } else if (cmd.type === 'C') {
      // Sample the bezier curve
      const steps = 8;
      const prev = points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 };
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        points.push({
          x: mt * mt * mt * prev.x + 3 * mt * mt * t * cmd.controlPoint1.x +
             3 * mt * t * t * cmd.controlPoint2.x + t * t * t * cmd.position.x,
          y: mt * mt * mt * prev.y + 3 * mt * mt * t * cmd.controlPoint1.y +
             3 * mt * t * t * cmd.controlPoint2.y + t * t * t * cmd.position.y,
        });
      }
    }
  }
  return points;
}

/**
 * Make a ControlPoint from a Point with placeholder metadata.
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
 * Apply wave distortion to a single subpath, creating a new subpath.
 */
function distortSubPath(sp: SubPath, state: WaveDistortState): SubPath {
  const polyPoints = flattenSubPath(sp);
  if (polyPoints.length < 2) return sp;

  const totalSamples = Math.max(8, state.frequency * state.resolution);
  const result: Command[] = [];

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples;
    const { point, normal } = interpolatePolyline(polyPoints, t);
    const wave = waveValue(t, state);

    let displaced: Point;
    if (state.direction === 'normal') {
      displaced = { x: point.x + normal.x * wave, y: point.y + normal.y * wave };
    } else if (state.direction === 'x') {
      displaced = { x: point.x + wave, y: point.y };
    } else {
      displaced = { x: point.x, y: point.y + wave };
    }

    if (i === 0) {
      result.push({ type: 'M', position: displaced });
    } else {
      // Use cubic curves for smooth wave output
      const prevT = (i - 1) / totalSamples;
      const midT1 = prevT + (t - prevT) / 3;
      const midT2 = prevT + (2 * (t - prevT)) / 3;

      const { point: p1, normal: n1 } = interpolatePolyline(polyPoints, midT1);
      const { point: p2, normal: n2 } = interpolatePolyline(polyPoints, midT2);
      const w1 = waveValue(midT1, state);
      const w2 = waveValue(midT2, state);

      let cp1: Point;
      let cp2: Point;
      if (state.direction === 'normal') {
        cp1 = { x: p1.x + n1.x * w1, y: p1.y + n1.y * w1 };
        cp2 = { x: p2.x + n2.x * w2, y: p2.y + n2.y * w2 };
      } else if (state.direction === 'x') {
        cp1 = { x: p1.x + w1, y: p1.y };
        cp2 = { x: p2.x + w2, y: p2.y };
      } else {
        cp1 = { x: p1.x, y: p1.y + w1 };
        cp2 = { x: p2.x, y: p2.y + w2 };
      }

      result.push({
        type: 'C',
        controlPoint1: makeCP(cp1, displaced),
        controlPoint2: makeCP(cp2, displaced),
        position: displaced,
      });
    }
  }

  // Keep the close command if the original had one
  if (sp.some((c) => c.type === 'Z')) {
    result.push({ type: 'Z' });
  }

  return result;
}

/**
 * Apply wave distortion to all subpaths.
 */
export function applyWaveDistortion(
  subPaths: SubPath[],
  state: WaveDistortState
): SubPath[] {
  return subPaths.map((sp) => distortSubPath(sp, state));
}
