import type { CanvasElement, SubPath, Command } from '../../types';
import type { LayerInfo } from './slice';

interface BBox {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
  hasFill: boolean;
}

function getPathBBox(el: CanvasElement): BBox | null {
  if (el.type !== 'path') return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  for (const sp of el.data.subPaths as SubPath[]) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      hasPoints = true;
      const p = cmd.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
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

  if (!hasPoints) return null;

  const width = maxX - minX;
  const height = maxY - minY;
  const fillColor = el.data.fillColor ?? 'none';
  const fillOpacity = el.data.fillOpacity ?? 1;
  const hasFill = fillColor !== 'none' && fillColor !== 'transparent' && fillOpacity > 0;

  return { id: el.id, minX, minY, maxX, maxY, width, height, area: width * height, hasFill };
}

function bboxOverlapArea(a: BBox, b: BBox): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return overlapX * overlapY;
}

export function analyzeLayerDepth(elements: CanvasElement[]): LayerInfo[] {
  // Elements are in render order (0 = bottommost, last = topmost)
  const bboxes: BBox[] = [];
  for (const el of elements) {
    const bbox = getPathBBox(el);
    if (bbox) bboxes.push(bbox);
  }

  const layers: LayerInfo[] = [];

  for (let i = 0; i < bboxes.length; i++) {
    const current = bboxes[i];
    const obscuredBy: string[] = [];
    let totalObscuredArea = 0;

    // Check all elements ABOVE this one (higher z-index)
    for (let j = i + 1; j < bboxes.length; j++) {
      const above = bboxes[j];
      // Only filled elements can obscure
      if (!above.hasFill) continue;

      const overlap = bboxOverlapArea(current, above);
      if (overlap > 0) {
        obscuredBy.push(above.id);
        totalObscuredArea += overlap;
      }
    }

    // Cap at 100%
    const obscuredPercent = current.area > 0
      ? Math.min(100, Math.round((totalObscuredArea / current.area) * 100))
      : 0;

    layers.push({
      id: current.id,
      zIndex: i,
      name: current.id.slice(0, 12),
      area: Math.round(current.area),
      obscuredBy,
      obscuredPercent,
      isFullyObscured: obscuredPercent >= 95,
    });
  }

  return layers;
}
