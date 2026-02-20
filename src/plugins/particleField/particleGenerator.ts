import type { SubPath, PathData, Point, ControlPoint } from '../../types';
import type { ParticleFieldState, ParticleShape } from './slice';

/** Deterministic PRNG (Mulberry32) */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BBox {
  minX: number; minY: number; maxX: number; maxY: number;
}

function getPathBBox(data: PathData): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
  return { minX, minY, maxX, maxY };
}

function subPathsToD(subPaths: SubPath[]): string {
  const parts: string[] = [];
  for (const sp of subPaths) {
    for (const cmd of sp) {
      switch (cmd.type) {
        case 'M': parts.push(`M${cmd.position.x},${cmd.position.y}`); break;
        case 'L': parts.push(`L${cmd.position.x},${cmd.position.y}`); break;
        case 'C':
          parts.push(`C${cmd.controlPoint1.x},${cmd.controlPoint1.y} ${cmd.controlPoint2.x},${cmd.controlPoint2.y} ${cmd.position.x},${cmd.position.y}`);
          break;
        case 'Z': parts.push('Z'); break;
      }
    }
  }
  return parts.join(' ');
}

function isPointInPath(pathD: string, x: number, y: number): boolean {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  const pathEl = document.createElementNS(svgNS, 'path');
  pathEl.setAttribute('d', pathD);
  svg.appendChild(pathEl);
  document.body.appendChild(svg);
  try {
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    return pathEl.isPointInFill(pt);
  } finally {
    document.body.removeChild(svg);
  }
}

/** Helper to create a ControlPoint with required metadata */
function makeCP(x: number, y: number, anchor: Point, cmdIdx: number, ptIdx: number): ControlPoint {
  return { x, y, commandIndex: cmdIdx, pointIndex: ptIdx, anchor, isControl: true };
}

/**
 * Generate a single particle shape as a SubPath centered at (cx, cy).
 */
function generateParticleShape(
  shape: ParticleShape,
  cx: number,
  cy: number,
  size: number,
  rotation: number
): SubPath {
  const r = size / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Rotate a point around (cx, cy)
  function rot(px: number, py: number): Point {
    const dx = px - cx;
    const dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  switch (shape) {
    case 'circle': {
      // 4-arc bezier circle approximation
      const k = 0.5523 * r;
      const top: Point = { x: cx, y: cy - r };
      const right: Point = { x: cx + r, y: cy };
      const bottom: Point = { x: cx, y: cy + r };
      const left: Point = { x: cx - r, y: cy };
      return [
        { type: 'M', position: right },
        { type: 'C', controlPoint1: makeCP(cx + r, cy + k, right, 0, 0), controlPoint2: makeCP(cx + k, cy + r, bottom, 0, 1), position: bottom },
        { type: 'C', controlPoint1: makeCP(cx - k, cy + r, bottom, 1, 0), controlPoint2: makeCP(cx - r, cy + k, left, 1, 1), position: left },
        { type: 'C', controlPoint1: makeCP(cx - r, cy - k, left, 2, 0), controlPoint2: makeCP(cx - k, cy - r, top, 2, 1), position: top },
        { type: 'C', controlPoint1: makeCP(cx + k, cy - r, top, 3, 0), controlPoint2: makeCP(cx + r, cy - k, right, 3, 1), position: right },
        { type: 'Z' },
      ];
    }

    case 'square': {
      const p1 = rot(cx - r, cy - r);
      const p2 = rot(cx + r, cy - r);
      const p3 = rot(cx + r, cy + r);
      const p4 = rot(cx - r, cy + r);
      return [
        { type: 'M', position: p1 },
        { type: 'L', position: p2 },
        { type: 'L', position: p3 },
        { type: 'L', position: p4 },
        { type: 'Z' },
      ];
    }

    case 'triangle': {
      const p1 = rot(cx, cy - r);
      const p2 = rot(cx + r * 0.866, cy + r * 0.5);
      const p3 = rot(cx - r * 0.866, cy + r * 0.5);
      return [
        { type: 'M', position: p1 },
        { type: 'L', position: p2 },
        { type: 'L', position: p3 },
        { type: 'Z' },
      ];
    }

    case 'star': {
      const points: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.4;
        points.push(rot(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
      }
      const cmds: SubPath = [{ type: 'M', position: points[0] }];
      for (let i = 1; i < points.length; i++) {
        cmds.push({ type: 'L', position: points[i] });
      }
      cmds.push({ type: 'Z' });
      return cmds;
    }

    case 'cross': {
      const w = r * 0.3;
      const pts: Point[] = [
        rot(cx - w, cy - r), rot(cx + w, cy - r),
        rot(cx + w, cy - w), rot(cx + r, cy - w),
        rot(cx + r, cy + w), rot(cx + w, cy + w),
        rot(cx + w, cy + r), rot(cx - w, cy + r),
        rot(cx - w, cy + w), rot(cx - r, cy + w),
        rot(cx - r, cy - w), rot(cx - w, cy - w),
      ];
      const cmds: SubPath = [{ type: 'M', position: pts[0] }];
      for (let i = 1; i < pts.length; i++) {
        cmds.push({ type: 'L', position: pts[i] });
      }
      cmds.push({ type: 'Z' });
      return cmds;
    }

    case 'line': {
      const p1 = rot(cx, cy - r);
      const p2 = rot(cx, cy + r);
      return [
        { type: 'M', position: p1 },
        { type: 'L', position: p2 },
      ];
    }
  }
}

/**
 * Generate particle positions inside the bounding path.
 */
function generatePositions(
  bbox: BBox,
  pathD: string,
  count: number,
  distribution: string,
  rng: () => number
): Point[] {
  const positions: Point[] = [];
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;

  if (distribution === 'random') {
    let attempts = 0;
    const maxAttempts = count * 10;
    while (positions.length < count && attempts < maxAttempts) {
      const x = bbox.minX + rng() * width;
      const y = bbox.minY + rng() * height;
      if (isPointInPath(pathD, x, y)) {
        positions.push({ x, y });
      }
      attempts++;
    }
  } else if (distribution === 'grid-jitter') {
    const cellSize = Math.sqrt((width * height) / count);
    const jitter = cellSize * 0.4;
    for (let x = bbox.minX + cellSize / 2; x < bbox.maxX; x += cellSize) {
      for (let y = bbox.minY + cellSize / 2; y < bbox.maxY; y += cellSize) {
        const jx = x + (rng() - 0.5) * jitter * 2;
        const jy = y + (rng() - 0.5) * jitter * 2;
        if (isPointInPath(pathD, jx, jy)) {
          positions.push({ x: jx, y: jy });
        }
      }
    }
  } else if (distribution === 'poisson') {
    // Simplified Poisson disk sampling via dart throwing
    const minDist = Math.sqrt((width * height) / (count * 2));
    let attempts = 0;
    const maxAttempts = count * 20;
    while (positions.length < count && attempts < maxAttempts) {
      const x = bbox.minX + rng() * width;
      const y = bbox.minY + rng() * height;
      attempts++;
      if (!isPointInPath(pathD, x, y)) continue;

      let tooClose = false;
      for (const existing of positions) {
        const dx = x - existing.x;
        const dy = y - existing.y;
        if (dx * dx + dy * dy < minDist * minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}

/**
 * Generate all particle SubPaths to fill a source path.
 */
export function generateParticleField(
  sourceData: PathData,
  settings: ParticleFieldState
): SubPath[] {
  const { shape, distribution, count, minSize, maxSize, randomRotation, seed } = settings;
  const bbox = getPathBBox(sourceData);
  const pathD = subPathsToD(sourceData.subPaths);
  const rng = seededRandom(seed);

  const positions = generatePositions(bbox, pathD, count, distribution, rng);
  const results: SubPath[] = [];

  for (const pos of positions) {
    const size = minSize + rng() * (maxSize - minSize);
    const rotation = randomRotation ? rng() * Math.PI * 2 : 0;
    results.push(generateParticleShape(shape, pos.x, pos.y, size, rotation));
  }

  return results;
}
