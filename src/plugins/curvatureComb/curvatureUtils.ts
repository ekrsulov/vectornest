import type { SubPath, Command, Point } from '../../types';

/** Evaluate a cubic bezier at parameter t */
function cubicBezier(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): Point {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x,
    y: u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y,
  };
}

/** First derivative of cubic bezier */
function cubicBezierDeriv(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): Point {
  const u = 1 - t;
  const u2 = u * u;
  const t2 = t * t;
  return {
    x: 3 * u2 * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * u2 * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

/** Second derivative of cubic bezier */
function cubicBezierDeriv2(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): Point {
  const u = 1 - t;
  return {
    x: 6 * u * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
    y: 6 * u * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y),
  };
}

/** Compute signed curvature: k = (x'y'' - y'x'') / (x'^2 + y'^2)^(3/2) */
function computeCurvature(d1: Point, d2: Point): number {
  const cross = d1.x * d2.y - d1.y * d2.x;
  const speedSq = d1.x * d1.x + d1.y * d1.y;
  const speed = Math.sqrt(speedSq);
  if (speed < 1e-10) return 0;
  return cross / (speedSq * speed);
}

export interface CombSample {
  /** Point on the curve */
  point: Point;
  /** Normal direction (unit vector) */
  normal: Point;
  /** Signed curvature value */
  curvature: number;
  /** Parameter t along segment */
  t: number;
}

export interface CombSegment {
  samples: CombSample[];
}

export interface CurvatureAnalysis {
  segments: CombSegment[];
  inflections: Point[];
  extrema: Point[];
}

/** Sample curvature along a cubic bezier segment */
function sampleCubicCurvature(
  p0: Point, p1: Point, p2: Point, p3: Point, density: number
): CombSample[] {
  const samples: CombSample[] = [];
  const steps = Math.max(4, density);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = cubicBezier(p0, p1, p2, p3, t);
    const d1 = cubicBezierDeriv(p0, p1, p2, p3, t);
    const d2 = cubicBezierDeriv2(p0, p1, p2, p3, t);

    const curvature = computeCurvature(d1, d2);
    const speed = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
    let normal: Point;
    if (speed > 1e-10) {
      normal = { x: -d1.y / speed, y: d1.x / speed };
    } else {
      normal = { x: 0, y: -1 };
    }

    samples.push({ point: pt, normal, curvature, t });
  }

  return samples;
}

/** Sample curvature along a line segment (curvature is always 0) */
function sampleLineCurvature(
  p0: Point, p1: Point, density: number
): CombSample[] {
  const samples: CombSample[] = [];
  const steps = Math.max(2, Math.floor(density / 2));
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1e-10) return samples;

  const normal: Point = { x: -dy / len, y: dx / len };

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = { x: p0.x + t * dx, y: p0.y + t * dy };
    samples.push({ point: pt, normal, curvature: 0, t });
  }

  return samples;
}

/** Analyze curvature of all subpaths */
export function analyzeCurvature(
  subPaths: SubPath[], density: number
): CurvatureAnalysis {
  const segments: CombSegment[] = [];
  const inflections: Point[] = [];
  const extrema: Point[] = [];

  for (const subPath of subPaths) {
    let currentPos: Point = { x: 0, y: 0 };

    for (let i = 0; i < subPath.length; i++) {
      const cmd: Command = subPath[i];

      if (cmd.type === 'M') {
        currentPos = cmd.position;
        continue;
      }

      if (cmd.type === 'Z') continue;

      if (cmd.type === 'L') {
        const samples = sampleLineCurvature(currentPos, cmd.position, density);
        if (samples.length > 0) {
          segments.push({ samples });
        }
        currentPos = cmd.position;
        continue;
      }

      if (cmd.type === 'C') {
        const p0 = currentPos;
        const p1 = cmd.controlPoint1;
        const p2 = cmd.controlPoint2;
        const p3 = cmd.position;

        const samples = sampleCubicCurvature(p0, p1, p2, p3, density);
        segments.push({ samples });

        // Detect inflection points (sign changes in curvature)
        for (let j = 1; j < samples.length; j++) {
          const prev = samples[j - 1];
          const curr = samples[j];
          if (prev.curvature * curr.curvature < 0) {
            // Approximate inflection point by interpolation
            const ratio = Math.abs(prev.curvature) /
              (Math.abs(prev.curvature) + Math.abs(curr.curvature));
            inflections.push({
              x: prev.point.x + ratio * (curr.point.x - prev.point.x),
              y: prev.point.y + ratio * (curr.point.y - prev.point.y),
            });
          }
        }

        // Detect curvature extrema (local maxima in |curvature|)
        for (let j = 1; j < samples.length - 1; j++) {
          const absPrev = Math.abs(samples[j - 1].curvature);
          const absCurr = Math.abs(samples[j].curvature);
          const absNext = Math.abs(samples[j + 1].curvature);
          if (absCurr > absPrev && absCurr > absNext && absCurr > 0.001) {
            extrema.push(samples[j].point);
          }
        }

        currentPos = cmd.position;
      }
    }
  }

  return { segments, inflections, extrema };
}
