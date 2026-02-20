import type { CanvasElement, SubPath, Command } from '../../types';
import type { HeatmapCell } from './slice';

function getCenter(el: CanvasElement): { x: number; y: number } | null {
  if (el.type !== 'path') return null;
  const pts: { x: number; y: number }[] = [];
  for (const sp of el.data.subPaths as SubPath[]) {
    for (const cmd of sp as Command[]) {
      if (cmd.type !== 'Z') pts.push(cmd.position);
    }
  }
  if (pts.length === 0) return null;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: cx, y: cy };
}

export function computeHeatmap(elements: CanvasElement[], gridSize: number): HeatmapCell[] {
  const centers: { x: number; y: number }[] = [];
  for (const el of elements) {
    const c = getCenter(el);
    if (c) centers.push(c);
  }

  if (centers.length === 0) return [];

  // Find bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of centers) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }

  const cols = Math.ceil((maxX - minX + 1) / gridSize) + 1;
  const rows = Math.ceil((maxY - minY + 1) / gridSize) + 1;

  // Count elements per cell
  const grid = new Map<string, number>();
  let maxCount = 0;

  for (const c of centers) {
    const col = Math.floor((c.x - minX) / gridSize);
    const row = Math.floor((c.y - minY) / gridSize);
    const key = `${col},${row}`;
    const count = (grid.get(key) ?? 0) + 1;
    grid.set(key, count);
    if (count > maxCount) maxCount = count;
  }

  if (maxCount === 0) return [];

  const cells: HeatmapCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const count = grid.get(`${col},${row}`) ?? 0;
      if (count > 0) {
        cells.push({
          x: minX + col * gridSize,
          y: minY + row * gridSize,
          count,
          intensity: count / maxCount,
        });
      }
    }
  }

  return cells;
}
