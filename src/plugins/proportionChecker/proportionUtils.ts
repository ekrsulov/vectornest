import type { CanvasElement, SubPath, Command } from '../../types';
import type { ProportionResult } from './slice';

const STANDARD_RATIOS: { name: string; value: number }[] = [
  { name: '1:1 (Square)', value: 1 },
  { name: 'φ Golden Ratio', value: 1.618 },
  { name: '4:3', value: 1.333 },
  { name: '3:2', value: 1.5 },
  { name: '16:9', value: 1.778 },
  { name: '16:10', value: 1.6 },
  { name: '√2 (A-paper)', value: 1.414 },
  { name: '2:1', value: 2 },
  { name: '3:1', value: 3 },
  { name: '21:9 Ultrawide', value: 2.333 },
  { name: '5:4', value: 1.25 },
  { name: '2:3', value: 0.667 },
  { name: '9:16 (vertical)', value: 0.5625 },
];

function getBounds(el: CanvasElement): { w: number; h: number } | null {
  if (el.type !== 'path') return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const sp of el.data.subPaths as SubPath[]) {
    for (const cmd of sp as Command[]) {
      if (cmd.type === 'Z') continue;
      const p = cmd.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 1 || h < 1) return null;
  return { w, h };
}

export function checkProportions(elements: CanvasElement[]): ProportionResult[] {
  const results: ProportionResult[] = [];

  for (const el of elements) {
    const bounds = getBounds(el);
    if (!bounds) continue;

    const ratio = bounds.w / bounds.h;

    // Find closest standard ratio
    let closest = STANDARD_RATIOS[0];
    let minDev = Infinity;
    for (const std of STANDARD_RATIOS) {
      const dev = Math.abs(ratio - std.value) / std.value;
      if (dev < minDev) {
        minDev = dev;
        closest = std;
      }
    }

    const label = (el.data.metadata?.name as string) ||
      (el.data.metadata?.label as string) || el.id.slice(0, 8);

    results.push({
      elementId: el.id,
      label,
      width: Math.round(bounds.w * 10) / 10,
      height: Math.round(bounds.h * 10) / 10,
      ratio: Math.round(ratio * 1000) / 1000,
      closestStandard: closest.name,
      closestRatioValue: closest.value,
      deviation: Math.round(minDev * 1000) / 10,
    });
  }

  return results.sort((a, b) => a.deviation - b.deviation);
}

export { STANDARD_RATIOS };
