import type { SubPath, Command, Point } from '../../types';
import type { MazeAlgorithm } from './slice';

/* ------------------------------------------------------------------ */
/*  Seeded PRNG                                                       */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Grid cell representation                                          */
/* ------------------------------------------------------------------ */
interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

function createGrid(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      };
    }
  }
  return grid;
}

function removeWall(a: Cell, b: Cell): void {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  if (dr === -1) {
    a.walls.top = false;
    b.walls.bottom = false;
  } else if (dr === 1) {
    a.walls.bottom = false;
    b.walls.top = false;
  } else if (dc === -1) {
    a.walls.left = false;
    b.walls.right = false;
  } else if (dc === 1) {
    a.walls.right = false;
    b.walls.left = false;
  }
}

function getNeighbors(grid: Cell[][], row: number, col: number, unvisitedOnly: boolean): Cell[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const neighbors: Cell[] = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      if (!unvisitedOnly || !grid[nr][nc].visited) {
        neighbors.push(grid[nr][nc]);
      }
    }
  }
  return neighbors;
}

/* ------------------------------------------------------------------ */
/*  Maze generation algorithms                                        */
/* ------------------------------------------------------------------ */
function recursiveBacktracker(grid: Cell[][], rng: () => number): void {
  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisited = getNeighbors(grid, current.row, current.col, true);

    if (unvisited.length === 0) {
      stack.pop();
    } else {
      const next = unvisited[Math.floor(rng() * unvisited.length)];
      removeWall(current, next);
      next.visited = true;
      stack.push(next);
    }
  }
}

function primsAlgorithm(grid: Cell[][], rng: () => number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const startR = Math.floor(rng() * rows);
  const startC = Math.floor(rng() * cols);

  grid[startR][startC].visited = true;
  const frontier: Cell[] = [];

  const addFrontier = (r: number, c: number) => {
    const unvisited = getNeighbors(grid, r, c, true);
    for (const n of unvisited) {
      if (!frontier.includes(n)) {
        frontier.push(n);
      }
    }
  };

  addFrontier(startR, startC);

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const cell = frontier[idx];
    frontier.splice(idx, 1);

    const visitedNeighbors = getNeighbors(grid, cell.row, cell.col, false).filter(
      (n) => n.visited
    );

    if (visitedNeighbors.length > 0) {
      const neighbor = visitedNeighbors[Math.floor(rng() * visitedNeighbors.length)];
      removeWall(cell, neighbor);
      cell.visited = true;
      addFrontier(cell.row, cell.col);
    }
  }
}

interface Edge {
  cellA: Cell;
  cellB: Cell;
}

function kruskalsAlgorithm(grid: Cell[][], rng: () => number): void {
  const rows = grid.length;
  const cols = grid[0].length;

  // Union-Find
  const parent: number[] = [];
  const rank: number[] = [];
  const cellId = (r: number, c: number) => r * cols + c;
  const totalCells = rows * cols;

  for (let i = 0; i < totalCells; i++) {
    parent[i] = i;
    rank[i] = 0;
  }

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number): boolean {
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) return false;
    if (rank[rx] < rank[ry]) parent[rx] = ry;
    else if (rank[rx] > rank[ry]) parent[ry] = rx;
    else {
      parent[ry] = rx;
      rank[rx]++;
    }
    return true;
  }

  // Create all edges
  const edges: Edge[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push({ cellA: grid[r][c], cellB: grid[r][c + 1] });
      if (r + 1 < rows) edges.push({ cellA: grid[r][c], cellB: grid[r + 1][c] });
    }
  }

  // Shuffle edges
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  // Process edges
  for (const edge of edges) {
    const idA = cellId(edge.cellA.row, edge.cellA.col);
    const idB = cellId(edge.cellB.row, edge.cellB.col);
    if (union(idA, idB)) {
      removeWall(edge.cellA, edge.cellB);
      edge.cellA.visited = true;
      edge.cellB.visited = true;
    }
  }
}

function binaryTree(grid: Cell[][], rng: () => number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      cell.visited = true;
      const neighbors: Cell[] = [];
      if (r > 0) neighbors.push(grid[r - 1][c]); // north
      if (c > 0) neighbors.push(grid[r][c - 1]); // west
      if (neighbors.length > 0) {
        const chosen = neighbors[Math.floor(rng() * neighbors.length)];
        removeWall(cell, chosen);
      }
    }
  }
}

function sidewinder(grid: Cell[][], rng: () => number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    const run: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      cell.visited = true;
      run.push(cell);

      const atEast = c === cols - 1;
      const atNorth = r === 0;

      const shouldClose = atEast || (!atNorth && rng() < 0.5);

      if (shouldClose) {
        // Close out the run — carve north from random cell in run
        if (!atNorth && run.length > 0) {
          const member = run[Math.floor(rng() * run.length)];
          removeWall(member, grid[member.row - 1][member.col]);
        }
        run.length = 0;
      } else {
        // Carve east
        removeWall(cell, grid[r][c + 1]);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Convert maze grid to SVG SubPaths                                 */
/* ------------------------------------------------------------------ */
function gridToSubPaths(
  grid: Cell[][],
  cellSize: number,
  ox: number,
  oy: number,
  addOpenings: boolean
): SubPath[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const subPaths: SubPath[] = [];

  // Track drawn walls to avoid duplicates
  const drawnH = new Set<string>();
  const drawnV = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const x = ox + c * cellSize;
      const y = oy + r * cellSize;

      // Top wall
      if (cell.walls.top) {
        const key = `h-${r}-${c}`;
        if (!drawnH.has(key)) {
          drawnH.add(key);
          // Skip entrance opening
          if (!(addOpenings && r === 0 && c === 0)) {
            const from: Point = { x, y };
            const to: Point = { x: x + cellSize, y };
            subPaths.push([
              { type: 'M', position: from },
              { type: 'L', position: to },
            ] as Command[]);
          }
        }
      }

      // Right wall
      if (cell.walls.right) {
        const key = `v-${r}-${c + 1}`;
        if (!drawnV.has(key)) {
          drawnV.add(key);
          const from: Point = { x: x + cellSize, y };
          const to: Point = { x: x + cellSize, y: y + cellSize };
          subPaths.push([
            { type: 'M', position: from },
            { type: 'L', position: to },
          ] as Command[]);
        }
      }

      // Bottom wall
      if (cell.walls.bottom) {
        const key = `h-${r + 1}-${c}`;
        if (!drawnH.has(key)) {
          drawnH.add(key);
          // Skip exit opening
          if (!(addOpenings && r === rows - 1 && c === cols - 1)) {
            const from: Point = { x, y: y + cellSize };
            const to: Point = { x: x + cellSize, y: y + cellSize };
            subPaths.push([
              { type: 'M', position: from },
              { type: 'L', position: to },
            ] as Command[]);
          }
        }
      }

      // Left wall
      if (cell.walls.left) {
        const key = `v-${r}-${c}`;
        if (!drawnV.has(key)) {
          drawnV.add(key);
          const from: Point = { x, y };
          const to: Point = { x, y: y + cellSize };
          subPaths.push([
            { type: 'M', position: from },
            { type: 'L', position: to },
          ] as Command[]);
        }
      }
    }
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Circular maze                                                     */
/* ------------------------------------------------------------------ */
function generateCircularMaze(
  rings: number,
  cellSize: number,
  ox: number,
  oy: number,
  rng: () => number,
  addOpenings: boolean
): SubPath[] {
  const subPaths: SubPath[] = [];
  const cx = ox + rings * cellSize;
  const cy = oy + rings * cellSize;

  // Each ring has more cells (proportional to circumference)
  const ringCells: number[] = [];
  for (let r = 0; r < rings; r++) {
    ringCells.push(Math.max(4, Math.round((r + 1) * 6)));
  }

  // Walls: radial and arc walls
  // Use simple approach: draw concentric circles with radial walls
  // Randomly remove walls like recursive backtracker

  // Draw ring arcs
  for (let r = 0; r < rings; r++) {
    const radius = (r + 1) * cellSize;
    const segments = ringCells[r];
    const angleStep = (Math.PI * 2) / segments;

    for (let s = 0; s < segments; s++) {
      // Arc wall (outer circle of this ring)
      if (rng() > 0.35 || r === rings - 1) {
        const a1 = s * angleStep;
        const a2 = (s + 1) * angleStep;
        const p1: Point = { x: cx + Math.cos(a1) * radius, y: cy + Math.sin(a1) * radius };
        const p2: Point = { x: cx + Math.cos(a2) * radius, y: cy + Math.sin(a2) * radius };
        subPaths.push([
          { type: 'M', position: p1 },
          { type: 'L', position: p2 },
        ]);
      }

      // Radial wall
      if (rng() > 0.4 || (r === 0 && !(addOpenings && s === 0))) {
        const angle = s * angleStep;
        const innerR = r * cellSize;
        const outerR = (r + 1) * cellSize;
        if (innerR > 0) {
          const p1: Point = { x: cx + Math.cos(angle) * innerR, y: cy + Math.sin(angle) * innerR };
          const p2: Point = { x: cx + Math.cos(angle) * outerR, y: cy + Math.sin(angle) * outerR };
          subPaths.push([
            { type: 'M', position: p1 },
            { type: 'L', position: p2 },
          ]);
        }
      }
    }
  }

  return subPaths;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function generateMaze(params: {
  cols: number;
  rows: number;
  cellSize: number;
  algorithm: MazeAlgorithm;
  shape: string;
  offsetX: number;
  offsetY: number;
  seed: number;
  addOpenings: boolean;
}): SubPath[] {
  const rng = mulberry32(params.seed);

  if (params.shape === 'circular') {
    return generateCircularMaze(
      Math.max(params.rows, params.cols),
      params.cellSize,
      params.offsetX,
      params.offsetY,
      rng,
      params.addOpenings
    );
  }

  const grid = createGrid(params.rows, params.cols);

  switch (params.algorithm) {
    case 'backtracker':
      recursiveBacktracker(grid, rng);
      break;
    case 'prims':
      primsAlgorithm(grid, rng);
      break;
    case 'kruskal':
      kruskalsAlgorithm(grid, rng);
      break;
    case 'binary':
      binaryTree(grid, rng);
      break;
    case 'sidewinder':
      sidewinder(grid, rng);
      break;
  }

  return gridToSubPaths(grid, params.cellSize, params.offsetX, params.offsetY, params.addOpenings);
}
