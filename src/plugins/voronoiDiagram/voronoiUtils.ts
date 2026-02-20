import type { SubPath, Command, Point } from '../../types';
import type { PointDistribution } from './slice';

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
/*  Point generation                                                  */
/* ------------------------------------------------------------------ */
function generatePoints(
  count: number,
  w: number,
  h: number,
  ox: number,
  oy: number,
  margin: number,
  distribution: PointDistribution,
  jitter: number,
  seed: number
): Point[] {
  const rng = mulberry32(seed);
  const pts: Point[] = [];
  const iw = w - margin * 2;
  const ih = h - margin * 2;

  switch (distribution) {
    case 'random':
      for (let i = 0; i < count; i++) {
        pts.push({
          x: ox + margin + rng() * iw,
          y: oy + margin + rng() * ih,
        });
      }
      break;

    case 'grid': {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const stepX = iw / (cols + 1);
      const stepY = ih / (rows + 1);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (pts.length >= count) break;
          pts.push({
            x: ox + margin + stepX * (c + 1) + (rng() - 0.5) * stepX * jitter,
            y: oy + margin + stepY * (r + 1) + (rng() - 0.5) * stepY * jitter,
          });
        }
      }
      break;
    }

    case 'hex': {
      const cols = Math.ceil(Math.sqrt(count * 1.15));
      const rows = Math.ceil(count / cols);
      const stepX = iw / (cols + 1);
      const stepY = ih / (rows + 1);
      for (let r = 0; r < rows; r++) {
        const rowOffset = r % 2 === 0 ? 0 : stepX * 0.5;
        for (let c = 0; c < cols; c++) {
          if (pts.length >= count) break;
          pts.push({
            x: ox + margin + stepX * (c + 1) + rowOffset + (rng() - 0.5) * stepX * jitter,
            y: oy + margin + stepY * (r + 1) + (rng() - 0.5) * stepY * jitter,
          });
        }
      }
      break;
    }

    case 'poisson': {
      // Simple Poisson-disk-like sampling with dart throwing
      const minDist = Math.sqrt((iw * ih) / count) * 0.7;
      const maxAttempts = count * 30;
      let attempts = 0;
      while (pts.length < count && attempts < maxAttempts) {
        const candidate: Point = {
          x: ox + margin + rng() * iw,
          y: oy + margin + rng() * ih,
        };
        let valid = true;
        for (const p of pts) {
          const dx = p.x - candidate.x;
          const dy = p.y - candidate.y;
          if (dx * dx + dy * dy < minDist * minDist) {
            valid = false;
            break;
          }
        }
        if (valid) pts.push(candidate);
        attempts++;
      }
      break;
    }
  }

  return pts;
}

/* ------------------------------------------------------------------ */
/*  Delaunay triangulation (Bowyer-Watson)                            */
/* ------------------------------------------------------------------ */
interface Triangle {
  a: number;
  b: number;
  c: number;
}

interface Circle {
  cx: number;
  cy: number;
  r2: number;
}

function circumcircle(pts: Point[], a: number, b: number, c: number): Circle {
  const ax = pts[a].x,
    ay = pts[a].y;
  const bx = pts[b].x,
    by = pts[b].y;
  const cx2 = pts[c].x,
    cy2 = pts[c].y;

  const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
  if (Math.abs(D) < 1e-10) {
    return { cx: 0, cy: 0, r2: Infinity };
  }

  const ux =
    ((ax * ax + ay * ay) * (by - cy2) +
      (bx * bx + by * by) * (cy2 - ay) +
      (cx2 * cx2 + cy2 * cy2) * (ay - by)) /
    D;
  const uy =
    ((ax * ax + ay * ay) * (cx2 - bx) +
      (bx * bx + by * by) * (ax - cx2) +
      (cx2 * cx2 + cy2 * cy2) * (bx - ax)) /
    D;

  const dx = ax - ux;
  const dy = ay - uy;
  return { cx: ux, cy: uy, r2: dx * dx + dy * dy };
}

function delaunay(points: Point[]): Triangle[] {
  const n = points.length;
  if (n < 3) return [];

  // Create super-triangle enclosing all points
  const pts = [...points];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dmax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  pts.push({ x: midX - 20 * dmax, y: midY - dmax });
  pts.push({ x: midX, y: midY + 20 * dmax });
  pts.push({ x: midX + 20 * dmax, y: midY - dmax });

  const sA = n,
    sB = n + 1,
    sC = n + 2;
  let triangles: Triangle[] = [{ a: sA, b: sB, c: sC }];

  for (let i = 0; i < n; i++) {
    const px = pts[i].x;
    const py = pts[i].y;

    const badTriangles: Triangle[] = [];
    for (const tri of triangles) {
      const cc = circumcircle(pts, tri.a, tri.b, tri.c);
      const ddx = px - cc.cx;
      const ddy = py - cc.cy;
      if (ddx * ddx + ddy * ddy < cc.r2) {
        badTriangles.push(tri);
      }
    }

    // Find boundary polygon (edges not shared by bad triangles)
    const edges: [number, number][] = [];
    for (const tri of badTriangles) {
      edges.push([tri.a, tri.b]);
      edges.push([tri.b, tri.c]);
      edges.push([tri.c, tri.a]);
    }

    const polygon: [number, number][] = [];
    for (let e = 0; e < edges.length; e++) {
      let shared = false;
      for (let f = 0; f < edges.length; f++) {
        if (e === f) continue;
        if (
          (edges[e][0] === edges[f][1] && edges[e][1] === edges[f][0]) ||
          (edges[e][0] === edges[f][0] && edges[e][1] === edges[f][1])
        ) {
          shared = true;
          break;
        }
      }
      if (!shared) polygon.push(edges[e]);
    }

    // Remove bad triangles
    triangles = triangles.filter((t) => !badTriangles.includes(t));

    // Create new triangles
    for (const edge of polygon) {
      triangles.push({ a: edge[0], b: edge[1], c: i });
    }
  }

  // Remove triangles using super-triangle vertices
  return triangles.filter(
    (t) =>
      t.a !== sA &&
      t.a !== sB &&
      t.a !== sC &&
      t.b !== sA &&
      t.b !== sB &&
      t.b !== sC &&
      t.c !== sA &&
      t.c !== sB &&
      t.c !== sC
  );
}

/* ------------------------------------------------------------------ */
/*  Voronoi from Delaunay                                             */
/* ------------------------------------------------------------------ */
interface VoronoiEdge {
  from: Point;
  to: Point;
}

function voronoiEdges(
  points: Point[],
  triangles: Triangle[],
  clipW: number,
  clipH: number,
  clipOx: number,
  clipOy: number
): VoronoiEdge[] {
  // Build adjacency: for each edge, find the two triangles that share it
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgeTriangles = new Map<string, number[]>();

  for (let i = 0; i < triangles.length; i++) {
    const t = triangles[i];
    for (const [ea, eb] of [
      [t.a, t.b],
      [t.b, t.c],
      [t.c, t.a],
    ]) {
      const key = edgeKey(ea, eb);
      const arr = edgeTriangles.get(key) || [];
      arr.push(i);
      edgeTriangles.set(key, arr);
    }
  }

  // Circumcenters
  const centers = triangles.map((t) => {
    const cc = circumcircle(points, t.a, t.b, t.c);
    return { x: cc.cx, y: cc.cy };
  });

  const edges: VoronoiEdge[] = [];
  const minX = clipOx;
  const minY = clipOy;
  const maxX = clipOx + clipW;
  const maxY = clipOy + clipH;

  for (const [, tris] of edgeTriangles) {
    if (tris.length === 2) {
      const from = centers[tris[0]];
      const to = centers[tris[1]];

      // Clip to bounding box
      if (
        from.x >= minX &&
        from.x <= maxX &&
        from.y >= minY &&
        from.y <= maxY &&
        to.x >= minX &&
        to.x <= maxX &&
        to.y >= minY &&
        to.y <= maxY
      ) {
        edges.push({ from, to });
      }
    }
  }

  return edges;
}

/* ------------------------------------------------------------------ */
/*  Build SubPaths                                                    */
/* ------------------------------------------------------------------ */
function edgesToSubPaths(edges: VoronoiEdge[]): SubPath[] {
  return edges.map((e) => {
    const cmds: Command[] = [
      { type: 'M', position: e.from },
      { type: 'L', position: e.to },
    ];
    return cmds;
  });
}

function trianglesToSubPaths(points: Point[], triangles: Triangle[]): SubPath[] {
  return triangles.map((t) => {
    const cmds: Command[] = [
      { type: 'M', position: points[t.a] },
      { type: 'L', position: points[t.b] },
      { type: 'L', position: points[t.c] },
      { type: 'Z' },
    ];
    return cmds;
  });
}

function seedPointSubPaths(points: Point[], radius: number): SubPath[] {
  // Each seed point as a small diamond shape
  return points.map((p) => {
    const cmds: Command[] = [
      { type: 'M', position: { x: p.x, y: p.y - radius } },
      { type: 'L', position: { x: p.x + radius, y: p.y } },
      { type: 'L', position: { x: p.x, y: p.y + radius } },
      { type: 'L', position: { x: p.x - radius, y: p.y } },
      { type: 'Z' },
    ];
    return cmds;
  });
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export interface VoronoiResult {
  voronoiSubPaths: SubPath[];
  delaunaySubPaths: SubPath[];
  seedSubPaths: SubPath[];
}

export function generateVoronoiDiagram(params: {
  pointCount: number;
  distribution: PointDistribution;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  margin: number;
  seed: number;
  jitter: number;
  showSeedPoints: boolean;
}): VoronoiResult {
  const points = generatePoints(
    params.pointCount,
    params.width,
    params.height,
    params.offsetX,
    params.offsetY,
    params.margin,
    params.distribution,
    params.jitter,
    params.seed
  );

  const tris = delaunay(points);
  const vEdges = voronoiEdges(
    points,
    tris,
    params.width,
    params.height,
    params.offsetX,
    params.offsetY
  );

  return {
    voronoiSubPaths: edgesToSubPaths(vEdges),
    delaunaySubPaths: trianglesToSubPaths(points, tris),
    seedSubPaths: params.showSeedPoints ? seedPointSubPaths(points, 2) : [],
  };
}
