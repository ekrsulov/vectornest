import type { CanvasElement, SubPath, Command } from '../../types';
import type { BBoxInfo, OverlapInfo } from './slice';

export function computeBBoxes(elements: CanvasElement[]): BBoxInfo[] {
  const result: BBoxInfo[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;
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

    if (!hasPoints) continue;

    const width = maxX - minX;
    const height = maxY - minY;
    result.push({
      id: el.id,
      x: minX,
      y: minY,
      width,
      height,
      area: width * height,
      perimeter: 2 * (width + height),
    });
  }

  return result;
}

export function computeOverlaps(bboxes: BBoxInfo[]): OverlapInfo[] {
  const overlaps: OverlapInfo[] = [];

  for (let i = 0; i < bboxes.length; i++) {
    for (let j = i + 1; j < bboxes.length; j++) {
      const a = bboxes[i];
      const b = bboxes[j];

      const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      const overlapArea = overlapX * overlapY;

      if (overlapArea > 0) {
        const smallerArea = Math.min(a.area, b.area);
        const overlapPercent = smallerArea > 0
          ? Math.round((overlapArea / smallerArea) * 100)
          : 0;

        overlaps.push({
          idA: a.id,
          idB: b.id,
          overlapArea: Math.round(overlapArea),
          overlapPercent,
        });
      }
    }
  }

  return overlaps;
}

export function formatArea(area: number): string {
  if (area >= 1000000) return `${(area / 1000000).toFixed(1)}M px²`;
  if (area >= 1000) return `${(area / 1000).toFixed(1)}K px²`;
  return `${Math.round(area)} px²`;
}
