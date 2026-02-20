import type { CanvasElement, SubPath, Command } from '../../types';
import type { SymmetryResult } from './slice';

interface Point { x: number; y: number }

function extractPoints(subPaths: SubPath[]): Point[] {
  const points: Point[] = [];
  for (const sp of subPaths) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      points.push({ x: cmd.position.x, y: cmd.position.y });
    }
  }
  return points;
}

function getBounds(points: Point[]): { cx: number; cy: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

function nearestPointDist(target: Point, candidates: Point[]): number {
  let minDist = Infinity;
  for (const c of candidates) {
    const d = Math.sqrt((target.x - c.x) ** 2 + (target.y - c.y) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Score horizontal symmetry (reflection over vertical axis through center)
 */
function scoreHorizontalSymmetry(points: Point[], cx: number, tolerance: number): number {
  if (points.length < 2) return 0;
  let totalError = 0;
  for (const p of points) {
    const reflected: Point = { x: 2 * cx - p.x, y: p.y };
    totalError += nearestPointDist(reflected, points);
  }
  const avgError = totalError / points.length;
  return Math.max(0, Math.round((1 - avgError / (tolerance * 5)) * 100));
}

/**
 * Score vertical symmetry (reflection over horizontal axis through center)
 */
function scoreVerticalSymmetry(points: Point[], cy: number, tolerance: number): number {
  if (points.length < 2) return 0;
  let totalError = 0;
  for (const p of points) {
    const reflected: Point = { x: p.x, y: 2 * cy - p.y };
    totalError += nearestPointDist(reflected, points);
  }
  const avgError = totalError / points.length;
  return Math.max(0, Math.round((1 - avgError / (tolerance * 5)) * 100));
}

/**
 * Score 180° rotational symmetry
 */
function scoreRotationalSymmetry(points: Point[], cx: number, cy: number, tolerance: number): number {
  if (points.length < 2) return 0;
  let totalError = 0;
  for (const p of points) {
    const rotated: Point = { x: 2 * cx - p.x, y: 2 * cy - p.y };
    totalError += nearestPointDist(rotated, points);
  }
  const avgError = totalError / points.length;
  return Math.max(0, Math.round((1 - avgError / (tolerance * 5)) * 100));
}

export function detectSymmetry(elements: CanvasElement[], tolerance: number): SymmetryResult[] {
  const results: SymmetryResult[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;
    const points = extractPoints(el.data.subPaths);
    if (points.length < 3) continue;

    const bounds = getBounds(points);
    const h = scoreHorizontalSymmetry(points, bounds.cx, tolerance);
    const v = scoreVerticalSymmetry(points, bounds.cy, tolerance);
    const r = scoreRotationalSymmetry(points, bounds.cx, bounds.cy, tolerance);

    const scores = [
      { axis: 'horizontal' as const, score: h },
      { axis: 'vertical' as const, score: v },
      { axis: 'rotational' as const, score: r },
    ];
    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));

    results.push({
      elementId: el.id,
      horizontal: h,
      vertical: v,
      rotational180: r,
      bestAxis: best.score > 30 ? best.axis : 'none',
      bestScore: best.score,
    });
  }

  return results;
}
