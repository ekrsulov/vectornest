import type { CanvasElement, SubPath, Command } from '../../types';
import type { DistancePair } from './slice';

function getCenter(el: CanvasElement): { x: number; y: number } | null {
  if (el.type === 'path') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPoints = false;
    for (const sp of el.data.subPaths as SubPath[]) {
      for (const cmd of sp as Command[]) {
        if (cmd.type === 'Z') continue;
        hasPoints = true;
        minX = Math.min(minX, cmd.position.x);
        minY = Math.min(minY, cmd.position.y);
        maxX = Math.max(maxX, cmd.position.x);
        maxY = Math.max(maxY, cmd.position.y);
      }
    }
    if (!hasPoints) return null;
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  if (el.type === 'group') {
    const tx = el.data?.transform?.x ?? 0;
    const ty = el.data?.transform?.y ?? 0;
    return { x: tx, y: ty };
  }

  return null;
}

export function computeDistanceMatrix(elements: CanvasElement[]): {
  pairs: DistancePair[];
  nearestPair: DistancePair | null;
  farthestPair: DistancePair | null;
  avgDistance: number;
} {
  const items = elements
    .map((el) => ({
      id: el.id,
      label: (el.type === 'group' ? el.data.name : null) || el.id.slice(0, 8),
      center: getCenter(el),
    }))
    .filter((item) => item.center !== null);

  const pairs: DistancePair[] = [];
  let nearest: DistancePair | null = null;
  let farthest: DistancePair | null = null;
  let totalDist = 0;

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const dx = a.center!.x - b.center!.x;
      const dy = a.center!.y - b.center!.y;
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;

      const pair: DistancePair = {
        idA: a.id,
        labelA: a.label,
        idB: b.id,
        labelB: b.label,
        distance,
      };

      pairs.push(pair);
      totalDist += distance;

      if (!nearest || distance < nearest.distance) nearest = pair;
      if (!farthest || distance > farthest.distance) farthest = pair;
    }
  }

  pairs.sort((a, b) => a.distance - b.distance);

  return {
    pairs,
    nearestPair: nearest,
    farthestPair: farthest,
    avgDistance: pairs.length > 0 ? Math.round((totalDist / pairs.length) * 100) / 100 : 0,
  };
}
