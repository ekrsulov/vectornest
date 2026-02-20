import type { SubPath, Command, Point, ControlPoint } from '../../types';
import type { GuillochePreset } from './slice';

function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

/* ------------------------------------------------------------------ */
/*  Curve generators                                                  */
/* ------------------------------------------------------------------ */

/**
 * Hypotrochoid (spirograph) parametric curve.
 * x(t) = (R-r)*cos(t) + d*cos((R-r)/r * t)
 * y(t) = (R-r)*sin(t) - d*sin((R-r)/r * t)
 */
function spirograph(
  R: number, r: number, d: number,
  revolutions: number, resolution: number,
  cx: number, cy: number
): Point[] {
  const pts: Point[] = [];
  const totalSteps = revolutions * resolution;
  const diff = R - r;
  const ratio = diff / r;

  for (let i = 0; i <= totalSteps; i++) {
    const t = (i / resolution) * Math.PI * 2;
    pts.push({
      x: cx + diff * Math.cos(t) + d * Math.cos(ratio * t),
      y: cy + diff * Math.sin(t) - d * Math.sin(ratio * t),
    });
  }
  return pts;
}

/**
 * Epitrochoid parametric curve.
 * x(t) = (R+r)*cos(t) - d*cos((R+r)/r * t)
 * y(t) = (R+r)*sin(t) - d*sin((R+r)/r * t)
 */
function epitrochoid(
  R: number, r: number, d: number,
  revolutions: number, resolution: number,
  cx: number, cy: number
): Point[] {
  const pts: Point[] = [];
  const totalSteps = revolutions * resolution;
  const sum = R + r;
  const ratio = sum / r;

  for (let i = 0; i <= totalSteps; i++) {
    const t = (i / resolution) * Math.PI * 2;
    pts.push({
      x: cx + sum * Math.cos(t) - d * Math.cos(ratio * t),
      y: cy + sum * Math.sin(t) - d * Math.sin(ratio * t),
    });
  }
  return pts;
}

/**
 * Rosette pattern — overlapping circles.
 */
function rosette(
  R: number, petals: number, resolution: number,
  cx: number, cy: number
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= resolution; i++) {
    const t = (i / resolution) * Math.PI * 2;
    const radius = R * Math.cos(petals * t);
    pts.push({
      x: cx + radius * Math.cos(t),
      y: cy + radius * Math.sin(t),
    });
  }
  return pts;
}

/**
 * Wave guilloche — sinusoidal wave in a circular path.
 */
function waveGuilloche(
  R: number, amplitude: number, freq: number,
  revolutions: number, resolution: number,
  cx: number, cy: number
): Point[] {
  const pts: Point[] = [];
  const totalSteps = revolutions * resolution;

  for (let i = 0; i <= totalSteps; i++) {
    const t = (i / resolution) * Math.PI * 2;
    const wave = amplitude * Math.sin(freq * t);
    const radius = R + wave;
    pts.push({
      x: cx + radius * Math.cos(t),
      y: cy + radius * Math.sin(t),
    });
  }
  return pts;
}

/**
 * Lissajous curve.
 * x(t) = A*sin(a*t + delta), y(t) = B*sin(b*t)
 */
function lissajous(
  A: number, B: number, a: number, b: number,
  delta: number, resolution: number,
  cx: number, cy: number
): Point[] {
  const pts: Point[] = [];
  const total = resolution * Math.max(a, b);
  for (let i = 0; i <= total; i++) {
    const t = (i / resolution) * Math.PI * 2;
    pts.push({
      x: cx + A * Math.sin(a * t + delta),
      y: cy + B * Math.sin(b * t),
    });
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/*  Convert points to smooth cubic Bezier SubPath                     */
/* ------------------------------------------------------------------ */
function pointsToSmoothSubPath(pts: Point[]): SubPath {
  if (pts.length < 2) return [];

  const cmds: Command[] = [{ type: 'M', position: pts[0] }];

  // Use Catmull-Rom → cubic Bezier conversion for smooth curves
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const tension = 6;
    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) / tension,
      y: p1.y + (p2.y - p0.y) / tension,
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) / tension,
      y: p2.y - (p3.y - p1.y) / tension,
    };

    cmds.push({
      type: 'C',
      controlPoint1: makeCP(cp1, p2),
      controlPoint2: makeCP(cp2, p2),
      position: p2,
    });
  }

  return cmds;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export interface GuillocheParams {
  preset: GuillochePreset;
  R: number;
  r: number;
  d: number;
  revolutions: number;
  resolution: number;
  freqX: number;
  freqY: number;
  phase: number;
  layers: number;
  layerSpacing: number;
  centerX: number;
  centerY: number;
}

export function generateGuilloche(params: GuillocheParams): SubPath[] {
  const {
    preset, R, r, d, revolutions, resolution,
    freqX, freqY, phase, layers, layerSpacing,
    centerX, centerY,
  } = params;

  const allSubPaths: SubPath[] = [];
  const phaseRad = (phase * Math.PI) / 180;

  for (let layer = 0; layer < layers; layer++) {
    const offset = layer * layerSpacing;
    const currentR = R + offset;

    let pts: Point[];

    switch (preset) {
      case 'spirograph':
        pts = spirograph(currentR, r, d, revolutions, resolution, centerX, centerY);
        break;
      case 'epitrochoid':
        pts = epitrochoid(currentR, r, d, revolutions, resolution, centerX, centerY);
        break;
      case 'rosette':
        pts = rosette(currentR, Math.round(r / 5) || 3, resolution * 2, centerX, centerY);
        break;
      case 'wave_guilloche':
        pts = waveGuilloche(currentR, d, freqX, revolutions, resolution, centerX, centerY);
        break;
      case 'lissajous':
        pts = lissajous(currentR, currentR * 0.8, freqX, freqY, phaseRad, resolution, centerX, centerY);
        break;
    }

    const sp = pointsToSmoothSubPath(pts);
    if (sp.length > 0) allSubPaths.push(sp);
  }

  return allSubPaths;
}
