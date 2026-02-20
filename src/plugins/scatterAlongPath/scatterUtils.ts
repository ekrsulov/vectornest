import type { Point, SubPath, Command, PathData, ControlPoint } from '../../types';
import type { ScatterAlongPathState } from './slice';

/** Simple deterministic PRNG (Mulberry32) for reproducible randomness */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert subPaths to SVG d string for use with SVGPathElement */
function subPathsToD(subPaths: SubPath[]): string {
  const parts: string[] = [];
  for (const sp of subPaths) {
    for (const cmd of sp) {
      switch (cmd.type) {
        case 'M':
          parts.push(`M${cmd.position.x},${cmd.position.y}`);
          break;
        case 'L':
          parts.push(`L${cmd.position.x},${cmd.position.y}`);
          break;
        case 'C':
          parts.push(
            `C${cmd.controlPoint1.x},${cmd.controlPoint1.y} ${cmd.controlPoint2.x},${cmd.controlPoint2.y} ${cmd.position.x},${cmd.position.y}`
          );
          break;
        case 'Z':
          parts.push('Z');
          break;
      }
    }
  }
  return parts.join(' ');
}

/**
 * Sample a point and tangent angle at parameter t (0..1) along an SVG path.
 * Uses browser's SVGPathElement for accurate sampling.
 */
function samplePath(
  pathD: string,
  t: number
): { point: Point; angle: number } {
  // Create a temporary path element to measure
  const svgNS = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(svgNS, 'svg');
  const pathEl = document.createElementNS(svgNS, 'path');
  pathEl.setAttribute('d', pathD);
  svgEl.appendChild(pathEl);
  document.body.appendChild(svgEl);

  try {
    const totalLen = pathEl.getTotalLength();
    const dist = t * totalLen;

    const pt = pathEl.getPointAtLength(dist);

    // Compute tangent by sampling two nearby points
    const delta = 0.5;
    const ptBefore = pathEl.getPointAtLength(Math.max(0, dist - delta));
    const ptAfter = pathEl.getPointAtLength(Math.min(totalLen, dist + delta));
    const angle = Math.atan2(ptAfter.y - ptBefore.y, ptAfter.x - ptBefore.x) * (180 / Math.PI);

    return { point: { x: pt.x, y: pt.y }, angle };
  } finally {
    document.body.removeChild(svgEl);
  }
}

/**
 * Compute the bounding box center of a PathData.
 */
function getPathCenter(data: PathData): Point {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const sp of data.subPaths) {
    for (const cmd of sp) {
      if (cmd.type !== 'Z') {
        const { x, y } = cmd.position;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * Translate all points in a SubPath[] by (dx, dy), optionally scale and rotate
 */
function transformSubPaths(
  subPaths: SubPath[],
  center: Point,
  dx: number,
  dy: number,
  scale: number,
  angleDeg: number
): SubPath[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  function transformPoint(p: Point): Point {
    // Translate to origin, scale, rotate, translate to target
    const rx = (p.x - center.x) * scale;
    const ry = (p.y - center.y) * scale;
    return {
      x: rx * cos - ry * sin + dx,
      y: rx * sin + ry * cos + dy,
    };
  }

  function transformControlPoint(cp: ControlPoint): ControlPoint {
    const tp = transformPoint(cp);
    return {
      ...cp,
      x: tp.x,
      y: tp.y,
      anchor: transformPoint(cp.anchor),
    };
  }

  return subPaths.map((sp) =>
    sp.map((cmd): Command => {
      switch (cmd.type) {
        case 'M':
        case 'L':
          return { type: cmd.type, position: transformPoint(cmd.position) };
        case 'C':
          return {
            type: 'C',
            controlPoint1: transformControlPoint(cmd.controlPoint1),
            controlPoint2: transformControlPoint(cmd.controlPoint2),
            position: transformPoint(cmd.position),
          };
        case 'Z':
          return { type: 'Z' };
      }
    })
  );
}

export interface ScatteredCopy {
  subPaths: SubPath[];
}

/**
 * Generate scattered copies of `sourceData` along `guidePath`.
 * Returns an array of transformed SubPaths for each copy.
 */
export function generateScatterCopies(
  sourceData: PathData,
  guideData: PathData,
  settings: ScatterAlongPathState
): ScatteredCopy[] {
  const { copies, mode, scale, scaleVariation, align, rotationOffset, rotationVariation, perpendicularOffset, seed } =
    settings;

  if (copies < 1) return [];

  const guideD = subPathsToD(guideData.subPaths);
  const center = getPathCenter(sourceData);
  const rng = seededRandom(seed);

  // Compute t parameters for each copy
  const tValues: number[] = [];
  if (mode === 'even') {
    for (let i = 0; i < copies; i++) {
      tValues.push(copies === 1 ? 0.5 : i / (copies - 1));
    }
  } else {
    for (let i = 0; i < copies; i++) {
      tValues.push(rng());
    }
    tValues.sort((a, b) => a - b);
  }

  const results: ScatteredCopy[] = [];

  for (const t of tValues) {
    const { point, angle } = samplePath(guideD, t);

    // Compute effective scale with variation
    const sv = scaleVariation > 0 ? 1 + (rng() * 2 - 1) * (scaleVariation / 100) : 1;
    const effectiveScale = scale * sv;

    // Compute effective rotation
    let effectiveAngle = rotationOffset;
    if (align === 'tangent') {
      effectiveAngle += angle;
    }
    if (rotationVariation > 0) {
      effectiveAngle += (rng() * 2 - 1) * rotationVariation;
    }

    // Apply perpendicular offset
    const perpRad = ((angle + 90) * Math.PI) / 180;
    const dx = point.x + Math.cos(perpRad) * perpendicularOffset;
    const dy = point.y + Math.sin(perpRad) * perpendicularOffset;

    const transformed = transformSubPaths(sourceData.subPaths, center, dx, dy, effectiveScale, effectiveAngle);
    results.push({ subPaths: transformed });
  }

  return results;
}
