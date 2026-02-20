import type { Point, SubPath, Command, ControlPoint } from '../../types';
import type { GeometricPatternState } from './slice';

/**
 * Rotate a point around an origin by angle in radians.
 */
function rotatePoint(p: Point, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Create a regular polygon centered at (cx, cy).
 */
function regularPolygon(cx: number, cy: number, radius: number, sides: number, startAngle = -Math.PI / 2): SubPath {
  const cmds: Command[] = [];
  for (let i = 0; i <= sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides;
    const pt: Point = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    cmds.push(i === 0 ? { type: 'M', position: pt } : { type: 'L', position: pt });
  }
  cmds.push({ type: 'Z' });
  return cmds;
}

/**
 * Create an Islamic star pattern centered at (cx, cy).
 */
function islamicStar(cx: number, cy: number, outerR: number, innerR: number, points: number): SubPath {
  const cmds: Command[] = [];
  const totalPoints = points * 2;
  for (let i = 0; i <= totalPoints; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / totalPoints;
    const r = i % 2 === 0 ? outerR : innerR;
    const pt: Point = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    cmds.push(i === 0 ? { type: 'M', position: pt } : { type: 'L', position: pt });
  }
  cmds.push({ type: 'Z' });
  return cmds;
}

/**
 * Create a Celtic knot element (interlocking circles approximation).
 */
function celticKnot(cx: number, cy: number, size: number): SubPath[] {
  const r = size * 0.35;
  const subPaths: SubPath[] = [];

  // Create two interlocking arcs using bezier curves
  const offsets: Point[] = [
    { x: -size * 0.15, y: -size * 0.15 },
    { x: size * 0.15, y: size * 0.15 },
  ];

  for (const off of offsets) {
    const centerX = cx + off.x;
    const centerY = cy + off.y;
    // Approximate circle with 4 bezier curves
    const k = r * 0.5523; // Magic number for bezier circle approximation
    const cmds: Command[] = [
      { type: 'M', position: { x: centerX, y: centerY - r } },
      {
        type: 'C',
        controlPoint1: makeCP({ x: centerX + k, y: centerY - r }, { x: centerX, y: centerY - r }),
        controlPoint2: makeCP({ x: centerX + r, y: centerY - k }, { x: centerX + r, y: centerY }),
        position: { x: centerX + r, y: centerY },
      },
      {
        type: 'C',
        controlPoint1: makeCP({ x: centerX + r, y: centerY + k }, { x: centerX + r, y: centerY }),
        controlPoint2: makeCP({ x: centerX + k, y: centerY + r }, { x: centerX, y: centerY + r }),
        position: { x: centerX, y: centerY + r },
      },
      {
        type: 'C',
        controlPoint1: makeCP({ x: centerX - k, y: centerY + r }, { x: centerX, y: centerY + r }),
        controlPoint2: makeCP({ x: centerX - r, y: centerY + k }, { x: centerX - r, y: centerY }),
        position: { x: centerX - r, y: centerY },
      },
      {
        type: 'C',
        controlPoint1: makeCP({ x: centerX - r, y: centerY - k }, { x: centerX - r, y: centerY }),
        controlPoint2: makeCP({ x: centerX - k, y: centerY - r }, { x: centerX, y: centerY - r }),
        position: { x: centerX, y: centerY - r },
      },
      { type: 'Z' },
    ];
    subPaths.push(cmds);
  }
  return subPaths;
}

/**
 * Create a Truchet tile at (cx, cy) — quarter-circle arcs.
 */
function truchetTile(cx: number, cy: number, size: number, variant: boolean): SubPath[] {
  const half = size / 2;
  const r = half;
  const k = r * 0.5523;

  if (variant) {
    // Arc from top-left to bottom-left, and from top-right to bottom-right
    return [
      [
        { type: 'M', position: { x: cx - half, y: cy - half } } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx - half + k, y: cy - half }, { x: cx - half, y: cy - half }),
          controlPoint2: makeCP({ x: cx, y: cy - half + (half - k) }, { x: cx, y: cy }),
          position: { x: cx, y: cy },
        } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx, y: cy + (half - k) }, { x: cx, y: cy }),
          controlPoint2: makeCP({ x: cx - half + k, y: cy + half }, { x: cx - half, y: cy + half }),
          position: { x: cx - half, y: cy + half },
        } as Command,
      ],
      [
        { type: 'M', position: { x: cx + half, y: cy - half } } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx + half - k, y: cy - half }, { x: cx + half, y: cy - half }),
          controlPoint2: makeCP({ x: cx, y: cy - half + (half - k) }, { x: cx, y: cy }),
          position: { x: cx, y: cy },
        } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx, y: cy + (half - k) }, { x: cx, y: cy }),
          controlPoint2: makeCP({ x: cx + half - k, y: cy + half }, { x: cx + half, y: cy + half }),
          position: { x: cx + half, y: cy + half },
        } as Command,
      ],
    ];
  } else {
    // Arc from top-left to top-right, and from bottom-left to bottom-right
    return [
      [
        { type: 'M', position: { x: cx - half, y: cy - half } } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx - half, y: cy - half + k }, { x: cx - half, y: cy - half }),
          controlPoint2: makeCP({ x: cx - (half - k), y: cy }, { x: cx, y: cy }),
          position: { x: cx, y: cy },
        } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx + (half - k), y: cy }, { x: cx, y: cy }),
          controlPoint2: makeCP({ x: cx + half, y: cy - half + k }, { x: cx + half, y: cy - half }),
          position: { x: cx + half, y: cy - half },
        } as Command,
      ],
      [
        { type: 'M', position: { x: cx - half, y: cy + half } } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx - half, y: cy + half - k }, { x: cx - half, y: cy + half }),
          controlPoint2: makeCP({ x: cx - (half - k), y: cy }, { x: cx, y: cy }),
          position: { x: cx, y: cy },
        } as Command,
        {
          type: 'C',
          controlPoint1: makeCP({ x: cx + (half - k), y: cy }, { x: cx, y: cy }),
          controlPoint2: makeCP({ x: cx + half, y: cy + half - k }, { x: cx + half, y: cy + half }),
          position: { x: cx + half, y: cy + half },
        } as Command,
      ],
    ];
  }
}

/**
 * Create a chevron row at a given position.
 */
function chevronRow(x: number, y: number, cellSize: number, cols: number): SubPath[] {
  const halfW = cellSize / 2;
  const halfH = cellSize / 3;
  const sps: SubPath[] = [];

  for (let c = 0; c < cols; c++) {
    const cx = x + c * cellSize;
    sps.push([
      { type: 'M', position: { x: cx, y: y } },
      { type: 'L', position: { x: cx + halfW, y: y + halfH } },
      { type: 'L', position: { x: cx + cellSize, y: y } },
    ]);
  }
  return sps;
}

/**
 * Build a control point.
 */
function makeCP(p: Point, anchor: Point): ControlPoint {
  return { x: p.x, y: p.y, commandIndex: 0, pointIndex: 0, anchor, isControl: true };
}

// -- Hash function for pseudo-random Truchet variant selection --
function simpleHash(a: number, b: number): boolean {
  return ((a * 2654435761 + b * 2246822519) & 0xffff) > 0x7fff;
}

/**
 * Generate the full geometric pattern.
 */
export function generatePattern(state: GeometricPatternState): SubPath[] {
  const { patternType, columns, rows, cellSize, starPoints, originX, originY, rotation } = state;
  let allSubPaths: SubPath[] = [];

  switch (patternType) {
    case 'hexagonal':
      allSubPaths = generateHexagonal(columns, rows, cellSize, originX, originY);
      break;
    case 'islamic-star':
      allSubPaths = generateIslamicStar(columns, rows, cellSize, starPoints, originX, originY);
      break;
    case 'penrose':
      allSubPaths = generatePenrose(columns, rows, cellSize, originX, originY);
      break;
    case 'celtic-knot':
      allSubPaths = generateCelticKnot(columns, rows, cellSize, originX, originY);
      break;
    case 'truchet':
      allSubPaths = generateTruchet(columns, rows, cellSize, originX, originY);
      break;
    case 'chevron':
      allSubPaths = generateChevron(columns, rows, cellSize, originX, originY);
      break;
  }

  // Apply global rotation if needed
  if (rotation !== 0) {
    const cx = originX + (columns * cellSize) / 2;
    const cy = originY + (rows * cellSize) / 2;
    const rad = (rotation * Math.PI) / 180;
    allSubPaths = allSubPaths.map((sp) =>
      sp.map((cmd): Command => {
        switch (cmd.type) {
          case 'M':
          case 'L':
            return { type: cmd.type, position: rotatePoint(cmd.position, cx, cy, rad) };
          case 'C': {
            const rp1 = rotatePoint(cmd.controlPoint1, cx, cy, rad);
            const rp2 = rotatePoint(cmd.controlPoint2, cx, cy, rad);
            const rpp = rotatePoint(cmd.position, cx, cy, rad);
            return {
              type: 'C',
              controlPoint1: makeCP(rp1, rpp),
              controlPoint2: makeCP(rp2, rpp),
              position: rpp,
            };
          }
          case 'Z':
            return { type: 'Z' };
        }
      })
    );
  }

  return allSubPaths;
}

function generateHexagonal(cols: number, rows: number, size: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  const r = size / 2;
  const rowH = r * Math.sqrt(3);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xOff = row % 2 === 0 ? 0 : r * 1.5;
      const cx = ox + col * r * 3 + xOff;
      const cy = oy + row * rowH;
      subPaths.push(regularPolygon(cx, cy, r, 6));
    }
  }
  return subPaths;
}

function generateIslamicStar(cols: number, rows: number, size: number, points: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  const outerR = size * 0.48;
  const innerR = outerR * 0.45;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = ox + col * size + size / 2;
      const cy = oy + row * size + size / 2;
      subPaths.push(islamicStar(cx, cy, outerR, innerR, points));
    }
  }
  return subPaths;
}

function generatePenrose(cols: number, rows: number, size: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  // Approximate Penrose tiling with thin and thick rhombi
  const halfDiag1 = size * 0.45; // thin rhombus
  const halfDiag2 = size * 0.25;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = ox + col * size + size / 2;
      const cy = oy + row * size + size / 2;
      const isThin = (row + col) % 2 === 0;
      const d1 = isThin ? halfDiag1 : halfDiag2;
      const d2 = isThin ? halfDiag2 : halfDiag1;

      // Rhombus as diamond shape
      const angle = ((row * 36 + col * 72) * Math.PI) / 180;

      const pts: Point[] = [
        { x: cx + d1 * Math.cos(angle), y: cy + d1 * Math.sin(angle) },
        { x: cx + d2 * Math.cos(angle + Math.PI / 2), y: cy + d2 * Math.sin(angle + Math.PI / 2) },
        { x: cx + d1 * Math.cos(angle + Math.PI), y: cy + d1 * Math.sin(angle + Math.PI) },
        { x: cx + d2 * Math.cos(angle + 3 * Math.PI / 2), y: cy + d2 * Math.sin(angle + 3 * Math.PI / 2) },
      ];

      const cmds: Command[] = [
        { type: 'M', position: pts[0] },
        { type: 'L', position: pts[1] },
        { type: 'L', position: pts[2] },
        { type: 'L', position: pts[3] },
        { type: 'Z' },
      ];
      subPaths.push(cmds);
    }
  }
  return subPaths;
}

function generateCelticKnot(cols: number, rows: number, size: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = ox + col * size + size / 2;
      const cy = oy + row * size + size / 2;
      subPaths.push(...celticKnot(cx, cy, size));
    }
  }
  return subPaths;
}

function generateTruchet(cols: number, rows: number, size: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = ox + col * size + size / 2;
      const cy = oy + row * size + size / 2;
      const variant = simpleHash(col, row);
      subPaths.push(...truchetTile(cx, cy, size, variant));
    }
  }
  return subPaths;
}

function generateChevron(cols: number, rows: number, size: number, ox: number, oy: number): SubPath[] {
  const subPaths: SubPath[] = [];
  for (let row = 0; row < rows; row++) {
    const y = oy + row * (size / 3);
    subPaths.push(...chevronRow(ox, y, size, cols));
  }
  return subPaths;
}
