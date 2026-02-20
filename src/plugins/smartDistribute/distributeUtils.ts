import type { DistributeMode, EasingType, SpacingMode } from './slice';
import type { CanvasElement, SubPath, Command } from '../../types';

interface Bounds {
  minX: number; minY: number; maxX: number; maxY: number;
}

interface ElementInfo {
  id: string;
  bounds: Bounds;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

function getPathBounds(el: CanvasElement): Bounds | null {
  if (el.type !== 'path') return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;
  el.data.subPaths.forEach((sp: SubPath) => {
    sp.forEach((c: Command) => {
      if (c.type === 'Z') return;
      hasPoints = true;
      const p = c.position;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (c.type === 'C') {
        for (const cp of [c.controlPoint1, c.controlPoint2]) {
          if (cp.x < minX) minX = cp.x;
          if (cp.y < minY) minY = cp.y;
          if (cp.x > maxX) maxX = cp.x;
          if (cp.y > maxY) maxY = cp.y;
        }
      }
    });
  });
  if (!hasPoints) return null;
  return { minX, minY, maxX, maxY };
}

function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'ease-in': return t * t;
    case 'ease-out': return 1 - (1 - t) * (1 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    default: return t;
  }
}

export function computeDistribution(
  elements: CanvasElement[],
  options: {
    mode: DistributeMode;
    easing: EasingType;
    spacingMode: SpacingMode;
    progressiveFactor: number;
    radialRadius: number;
    radialStartAngle: number;
    radialEndAngle: number;
    reverseOrder: boolean;
  }
): Map<string, { dx: number; dy: number }> {
  const result = new Map<string, { dx: number; dy: number }>();
  if (elements.length < 2) return result;

  const infos: ElementInfo[] = [];
  for (const el of elements) {
    const bounds = getPathBounds(el);
    if (!bounds) continue;
    infos.push({
      id: el.id,
      bounds,
      cx: (bounds.minX + bounds.maxX) / 2,
      cy: (bounds.minY + bounds.maxY) / 2,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    });
  }

  if (infos.length < 2) return result;

  // Sort by position
  if (options.mode === 'horizontal') {
    infos.sort((a, b) => a.cx - b.cx);
  } else if (options.mode === 'vertical') {
    infos.sort((a, b) => a.cy - b.cy);
  }

  if (options.reverseOrder) {
    infos.reverse();
  }

  const n = infos.length;

  if (options.mode === 'radial') {
    return computeRadialDistribution(infos, options, result);
  }

  // Linear distribution (horizontal or vertical or along-line)
  const isHorizontal = options.mode === 'horizontal' || options.mode === 'along-line';
  const first = infos[0];
  const last = infos[n - 1];

  if (options.spacingMode === 'equal-center') {
    const startPos = isHorizontal ? first.cx : first.cy;
    const endPos = isHorizontal ? last.cx : last.cy;
    const totalRange = endPos - startPos;

    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      const easedT = applyEasing(t, options.easing);
      const targetPos = startPos + easedT * totalRange;
      const current = isHorizontal ? infos[i].cx : infos[i].cy;
      const delta = targetPos - current;
      result.set(infos[i].id, {
        dx: isHorizontal ? delta : 0,
        dy: isHorizontal ? 0 : delta,
      });
    }
  } else if (options.spacingMode === 'equal-gap') {
    const totalSize = infos.reduce((acc, info) => acc + (isHorizontal ? info.width : info.height), 0);
    const startEdge = isHorizontal ? first.bounds.minX : first.bounds.minY;
    const endEdge = isHorizontal ? last.bounds.maxX : last.bounds.maxY;
    const totalSpace = (endEdge - startEdge) - totalSize;
    const gap = n > 1 ? totalSpace / (n - 1) : 0;

    let cursor = startEdge;
    for (let i = 0; i < n; i++) {
      const size = isHorizontal ? infos[i].width : infos[i].height;
      const currentStart = isHorizontal ? infos[i].bounds.minX : infos[i].bounds.minY;

      // Apply easing to the gap
      let adjustedCursor = cursor;
      if (i > 0 && options.easing !== 'linear') {
        const t = i / (n - 1);
        const easedT = applyEasing(t, options.easing);
        const linearPos = startEdge + (i / (n - 1)) * (endEdge - startEdge - size);
        adjustedCursor = startEdge + easedT * (endEdge - startEdge - size);
        // Correct for accumulated sizes
        const _unused = linearPos; // suppress lint
        void _unused;
        adjustedCursor = cursor; // Fall back to linear for gap mode
      }

      const delta = adjustedCursor - currentStart;
      result.set(infos[i].id, {
        dx: isHorizontal ? delta : 0,
        dy: isHorizontal ? 0 : delta,
      });
      cursor = adjustedCursor + size + gap;
    }
  } else {
    // Progressive spacing
    const factor = options.progressiveFactor;
    const startEdge = isHorizontal ? first.bounds.minX : first.bounds.minY;
    let cursor = startEdge;
    const baseGap = 20;

    for (let i = 0; i < n; i++) {
      const size = isHorizontal ? infos[i].width : infos[i].height;
      const currentStart = isHorizontal ? infos[i].bounds.minX : infos[i].bounds.minY;
      const delta = cursor - currentStart;
      result.set(infos[i].id, {
        dx: isHorizontal ? delta : 0,
        dy: isHorizontal ? 0 : delta,
      });
      cursor += size + baseGap * Math.pow(factor, i);
    }
  }

  return result;
}

function computeRadialDistribution(
  infos: ElementInfo[],
  options: {
    radialRadius: number;
    radialStartAngle: number;
    radialEndAngle: number;
    easing: EasingType;
  },
  result: Map<string, { dx: number; dy: number }>
): Map<string, { dx: number; dy: number }> {
  const n = infos.length;

  // Compute center of all elements
  const globalCx = infos.reduce((s, i) => s + i.cx, 0) / n;
  const globalCy = infos.reduce((s, i) => s + i.cy, 0) / n;

  const startRad = (options.radialStartAngle * Math.PI) / 180;
  const endRad = (options.radialEndAngle * Math.PI) / 180;
  const fullCircle = Math.abs(options.radialEndAngle - options.radialStartAngle) >= 360;

  for (let i = 0; i < n; i++) {
    const t = fullCircle ? i / n : (n > 1 ? i / (n - 1) : 0);
    const easedT = applyEasing(t, options.easing);
    const angle = startRad + easedT * (endRad - startRad);

    const targetX = globalCx + options.radialRadius * Math.cos(angle);
    const targetY = globalCy + options.radialRadius * Math.sin(angle);

    result.set(infos[i].id, {
      dx: targetX - infos[i].cx,
      dy: targetY - infos[i].cy,
    });
  }

  return result;
}
