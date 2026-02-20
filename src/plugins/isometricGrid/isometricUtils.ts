import type { SubPath, Command, Point } from '../../types';
import type { IsoStyle } from './slice';

/* ------------------------------------------------------------------ */
/*  Isometric coordinate helpers                                      */
/* ------------------------------------------------------------------ */

function isoProject(col: number, row: number, cellSize: number, angle: number, ox: number, oy: number): Point {
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  return {
    x: ox + (col - row) * cellSize * cosA,
    y: oy + (col + row) * cellSize * sinA,
  };
}

function makeLine(a: Point, b: Point): SubPath {
  return [
    { type: 'M', position: a },
    { type: 'L', position: b },
  ] as Command[];
}

function makePolygon(points: Point[]): SubPath {
  if (points.length < 2) return [];
  const cmds: Command[] = [{ type: 'M', position: points[0] }];
  for (let i = 1; i < points.length; i++) {
    cmds.push({ type: 'L', position: points[i] });
  }
  cmds.push({ type: 'Z' });
  return cmds;
}

/* ------------------------------------------------------------------ */
/*  Grid generators                                                   */
/* ------------------------------------------------------------------ */

function generateIsometricLines(
  cols: number, rows: number, cellSize: number, angle: number,
  ox: number, oy: number
): SubPath[] {
  const subPaths: SubPath[] = [];

  // Horizontal-ish lines (along rows)
  for (let r = 0; r <= rows; r++) {
    const from = isoProject(0, r, cellSize, angle, ox, oy);
    const to = isoProject(cols, r, cellSize, angle, ox, oy);
    subPaths.push(makeLine(from, to));
  }

  // Other direction lines (along cols)
  for (let c = 0; c <= cols; c++) {
    const from = isoProject(c, 0, cellSize, angle, ox, oy);
    const to = isoProject(c, rows, cellSize, angle, ox, oy);
    subPaths.push(makeLine(from, to));
  }

  return subPaths;
}

function generateIsometricCubes(
  cols: number, rows: number, cellSize: number, angle: number,
  cubeHeight: number, ox: number, oy: number, alternate: boolean
): SubPath[] {
  const subPaths: SubPath[] = [];
  const h = cellSize * cubeHeight;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (alternate && (c + r) % 2 !== 0) continue;

      // Top face
      const tl = isoProject(c, r, cellSize, angle, ox, oy);
      const tr = isoProject(c + 1, r, cellSize, angle, ox, oy);
      const br = isoProject(c + 1, r + 1, cellSize, angle, ox, oy);
      const bl = isoProject(c, r + 1, cellSize, angle, ox, oy);
      subPaths.push(makePolygon([tl, tr, br, bl]));

      // Left face
      const blDown = { x: bl.x, y: bl.y + h };
      const tlDown = { x: tl.x, y: tl.y + h };
      subPaths.push(makePolygon([tl, bl, blDown, tlDown]));

      // Right face
      const brDown = { x: br.x, y: br.y + h };
      subPaths.push(makePolygon([bl, br, brDown, blDown]));
    }
  }

  return subPaths;
}

function generateHexGrid(
  cols: number, rows: number, cellSize: number,
  ox: number, oy: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const w = cellSize * Math.sqrt(3);
  const h = cellSize * 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const xOff = r % 2 === 0 ? 0 : w / 2;
      const cx = ox + c * w + xOff;
      const cy = oy + r * h * 0.75;

      const vertices: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        vertices.push({
          x: cx + cellSize * Math.cos(a),
          y: cy + cellSize * Math.sin(a),
        });
      }
      subPaths.push(makePolygon(vertices));
    }
  }

  return subPaths;
}

function generateTriangleGrid(
  cols: number, rows: number, cellSize: number,
  ox: number, oy: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const h = (cellSize * Math.sqrt(3)) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * (cellSize / 2);
      const y = oy + r * h;
      const up = (c + r) % 2 === 0;

      if (up) {
        subPaths.push(makePolygon([
          { x, y: y + h },
          { x: x + cellSize / 2, y },
          { x: x + cellSize, y: y + h },
        ]));
      } else {
        subPaths.push(makePolygon([
          { x, y },
          { x: x + cellSize, y },
          { x: x + cellSize / 2, y: y + h },
        ]));
      }
    }
  }

  return subPaths;
}

function generateDiamondGrid(
  cols: number, rows: number, cellSize: number,
  ox: number, oy: number
): SubPath[] {
  const subPaths: SubPath[] = [];
  const half = cellSize / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = ox + c * cellSize + (r % 2 === 0 ? 0 : half);
      const cy = oy + r * half;

      subPaths.push(makePolygon([
        { x: cx, y: cy - half },
        { x: cx + half, y: cy },
        { x: cx, y: cy + half },
        { x: cx - half, y: cy },
      ]));
    }
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function generateIsometricGrid(params: {
  style: IsoStyle;
  cols: number;
  rows: number;
  cellSize: number;
  angle: number;
  cubeHeight: number;
  offsetX: number;
  offsetY: number;
  alternateShading: boolean;
}): SubPath[] {
  const { style, cols, rows, cellSize, angle, cubeHeight, offsetX, offsetY, alternateShading } = params;

  switch (style) {
    case 'grid':
      return generateIsometricLines(cols, rows, cellSize, angle, offsetX, offsetY);
    case 'cubes':
      return generateIsometricCubes(cols, rows, cellSize, angle, cubeHeight, offsetX, offsetY, alternateShading);
    case 'hexGrid':
      return generateHexGrid(cols, rows, cellSize, offsetX, offsetY);
    case 'triangleGrid':
      return generateTriangleGrid(cols, rows, cellSize, offsetX, offsetY);
    case 'diamond':
      return generateDiamondGrid(cols, rows, cellSize, offsetX, offsetY);
  }
}
