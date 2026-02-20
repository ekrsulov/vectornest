import type { SubPath, PathData, Point } from '../../types';
import type { PathTextureState } from './slice';

/** Simple deterministic PRNG (Mulberry32) */
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
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Compute bounding box of a PathData.
 */
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
      if (cmd.type === 'C') {
        for (const cp of [cmd.controlPoint1, cmd.controlPoint2]) {
          if (cp.x < minX) minX = cp.x;
          if (cp.y < minY) minY = cp.y;
          if (cp.x > maxX) maxX = cp.x;
          if (cp.y > maxY) maxY = cp.y;
        }
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Test if a point is inside a path using browser's SVG hit-testing.
 */
function isPointInPath(pathD: string, x: number, y: number): boolean {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  const pathEl = document.createElementNS(svgNS, 'path');
  pathEl.setAttribute('d', pathD);
  svg.appendChild(pathEl);
  document.body.appendChild(svg);
  try {
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pathEl.isPointInFill(pt);
  } finally {
    document.body.removeChild(svg);
  }
}

/**
 * Convert subPaths to SVG d-string.
 */
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

/**
 * Build a simple M/L subpath from a list of points.
 */
function pointsToSubPath(points: Point[]): SubPath {
  if (points.length < 2) return [];
  const cmds: SubPath = [{ type: 'M', position: points[0] }];
  for (let i = 1; i < points.length; i++) {
    cmds.push({ type: 'L', position: points[i] });
  }
  return cmds;
}

/**
 * Generate hatching lines (parallel lines at a given angle) clipped to the path bbox.
 */
function generateHatchingLines(
  bbox: BBox,
  spacing: number,
  angleDeg: number
): Array<[Point, Point]> {
  const lines: Array<[Point, Point]> = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const diagonal = Math.sqrt(width * width + height * height);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  const numLines = Math.ceil(diagonal / spacing) + 1;
  const halfSpan = (numLines * spacing) / 2;

  for (let i = 0; i <= numLines; i++) {
    const offset = -halfSpan + i * spacing;

    // Line perpendicular to angle, shifted by offset along the normal
    const nx = -sin;
    const ny = cos;

    // Line center point
    const lx = cx + nx * offset;
    const ly = cy + ny * offset;

    // Line endpoints extend along the angle direction
    const p1: Point = { x: lx - cos * diagonal, y: ly - sin * diagonal };
    const p2: Point = { x: lx + cos * diagonal, y: ly + sin * diagonal };
    lines.push([p1, p2]);
  }

  return lines;
}

/**
 * Generate texture SubPaths for a given source path and texture settings.
 */
export function generateTextureSubPaths(
  sourceData: PathData,
  settings: PathTextureState
): SubPath[] {
  const { pattern, density, spacing, angle, seed } = settings;
  const bbox = getPathBBox(sourceData);
  const pathD = subPathsToD(sourceData.subPaths);
  const rng = seededRandom(seed);
  const results: SubPath[] = [];

  // Effective spacing scaled by density (higher density = smaller spacing)
  const effectiveSpacing = spacing * (100 / Math.max(density, 10));

  switch (pattern) {
    case 'hatching': {
      const lines = generateHatchingLines(bbox, effectiveSpacing, angle);
      for (const [p1, p2] of lines) {
        // Sample along line and keep segments inside the path
        const steps = 40;
        let inside = false;
        let segStart: Point | null = null;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;
          const inPath = isPointInPath(pathD, x, y);
          if (inPath && !inside) {
            segStart = { x, y };
            inside = true;
          } else if (!inPath && inside && segStart) {
            const prevT = (s - 1) / steps;
            const endPt: Point = {
              x: p1.x + (p2.x - p1.x) * prevT,
              y: p1.y + (p2.y - p1.y) * prevT,
            };
            results.push(pointsToSubPath([segStart, endPt]));
            inside = false;
            segStart = null;
          }
        }
        if (inside && segStart) {
          results.push(pointsToSubPath([segStart, p2]));
        }
      }
      break;
    }

    case 'crosshatch': {
      // Two sets of hatching at perpendicular angles
      const lines1 = generateHatchingLines(bbox, effectiveSpacing, angle);
      const lines2 = generateHatchingLines(bbox, effectiveSpacing, angle + 90);
      for (const lines of [lines1, lines2]) {
        for (const [p1, p2] of lines) {
          const steps = 40;
          let inside = false;
          let segStart: Point | null = null;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const y = p1.y + (p2.y - p1.y) * t;
            const inPath = isPointInPath(pathD, x, y);
            if (inPath && !inside) {
              segStart = { x, y };
              inside = true;
            } else if (!inPath && inside && segStart) {
              const prevT = (s - 1) / steps;
              const endPt: Point = {
                x: p1.x + (p2.x - p1.x) * prevT,
                y: p1.y + (p2.y - p1.y) * prevT,
              };
              results.push(pointsToSubPath([segStart, endPt]));
              inside = false;
              segStart = null;
            }
          }
          if (inside && segStart) {
            results.push(pointsToSubPath([segStart, p2]));
          }
        }
      }
      break;
    }

    case 'stipple': {
      const width = bbox.maxX - bbox.minX;
      const height = bbox.maxY - bbox.minY;
      const area = width * height;
      const numDots = Math.round((density / 50) * (area / (spacing * spacing)));
      const dotRadius = settings.lineWidth * 0.5;

      for (let i = 0; i < numDots; i++) {
        const x = bbox.minX + rng() * width;
        const y = bbox.minY + rng() * height;
        if (!isPointInPath(pathD, x, y)) continue;

        // Create a tiny cross mark for each stipple dot
        results.push(pointsToSubPath([
          { x: x - dotRadius, y },
          { x: x + dotRadius, y },
        ]));
        results.push(pointsToSubPath([
          { x, y: y - dotRadius },
          { x, y: y + dotRadius },
        ]));
      }
      break;
    }

    case 'dots-grid': {
      const dotRadius = settings.lineWidth * 0.8;
      for (let x = bbox.minX; x <= bbox.maxX; x += effectiveSpacing) {
        for (let y = bbox.minY; y <= bbox.maxY; y += effectiveSpacing) {
          if (!isPointInPath(pathD, x, y)) continue;
          // Approximate a small circle with 4 cubic bezier arcs
          const r = dotRadius;
          const k = 0.5523; // bezier approximation of circle
          results.push([
            { type: 'M', position: { x: x + r, y } },
            { type: 'C', controlPoint1: { x: x + r, y: y + r * k, commandIndex: 0, pointIndex: 0, anchor: { x: x + r, y }, isControl: true }, controlPoint2: { x: x + r * k, y: y + r, commandIndex: 0, pointIndex: 1, anchor: { x, y: y + r }, isControl: true }, position: { x, y: y + r } },
            { type: 'C', controlPoint1: { x: x - r * k, y: y + r, commandIndex: 1, pointIndex: 0, anchor: { x, y: y + r }, isControl: true }, controlPoint2: { x: x - r, y: y + r * k, commandIndex: 1, pointIndex: 1, anchor: { x: x - r, y }, isControl: true }, position: { x: x - r, y } },
            { type: 'C', controlPoint1: { x: x - r, y: y - r * k, commandIndex: 2, pointIndex: 0, anchor: { x: x - r, y }, isControl: true }, controlPoint2: { x: x - r * k, y: y - r, commandIndex: 2, pointIndex: 1, anchor: { x, y: y - r }, isControl: true }, position: { x, y: y - r } },
            { type: 'C', controlPoint1: { x: x + r * k, y: y - r, commandIndex: 3, pointIndex: 0, anchor: { x, y: y - r }, isControl: true }, controlPoint2: { x: x + r, y: y - r * k, commandIndex: 3, pointIndex: 1, anchor: { x: x + r, y }, isControl: true }, position: { x: x + r, y } },
            { type: 'Z' },
          ] as SubPath);
        }
      }
      break;
    }

    case 'scribble': {
      const lines = generateHatchingLines(bbox, effectiveSpacing, angle);
      for (const [p1, p2] of lines) {
        const steps = 50;
        const pts: Point[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = p1.x + (p2.x - p1.x) * t + (rng() - 0.5) * spacing * 0.4;
          const y = p1.y + (p2.y - p1.y) * t + (rng() - 0.5) * spacing * 0.4;
          if (isPointInPath(pathD, x, y)) {
            pts.push({ x, y });
          } else if (pts.length >= 2) {
            results.push(pointsToSubPath(pts));
            pts.length = 0;
          } else {
            pts.length = 0;
          }
        }
        if (pts.length >= 2) {
          results.push(pointsToSubPath(pts));
        }
      }
      break;
    }
  }

  return results;
}
