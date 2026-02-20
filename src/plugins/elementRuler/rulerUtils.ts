import type { CanvasElement, SubPath, Command } from '../../types';

export interface ElementBounds {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface Measurement {
  type: 'distance' | 'gap-h' | 'gap-v' | 'angle' | 'dimension';
  fromId: string;
  toId: string;
  value: number;
  label: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  midpoint: { x: number; y: number };
}

export function getElementBounds(el: CanvasElement): ElementBounds | null {
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
  return {
    id: el.id,
    minX, minY, maxX, maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function computeMeasurements(
  elements: CanvasElement[],
  options: {
    showDistances: boolean;
    showAngles: boolean;
    showGaps: boolean;
    showDimensions: boolean;
  }
): Measurement[] {
  const boundsList: ElementBounds[] = [];
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b) boundsList.push(b);
  }

  if (boundsList.length < 1) return [];

  const measurements: Measurement[] = [];

  // Dimensions for each selected element
  if (options.showDimensions) {
    for (const b of boundsList) {
      measurements.push({
        type: 'dimension',
        fromId: b.id,
        toId: b.id,
        value: b.width,
        label: `${b.width.toFixed(1)}`,
        from: { x: b.minX, y: b.maxY + 8 },
        to: { x: b.maxX, y: b.maxY + 8 },
        midpoint: { x: b.cx, y: b.maxY + 8 },
      });
      measurements.push({
        type: 'dimension',
        fromId: b.id,
        toId: b.id,
        value: b.height,
        label: `${b.height.toFixed(1)}`,
        from: { x: b.maxX + 8, y: b.minY },
        to: { x: b.maxX + 8, y: b.maxY },
        midpoint: { x: b.maxX + 8, y: b.cy },
      });
    }
  }

  if (boundsList.length < 2) return measurements;

  // Pairwise measurements
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const a = boundsList[i];
      const b = boundsList[j];

      // Center-to-center distance
      if (options.showDistances) {
        const dist = Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
        measurements.push({
          type: 'distance',
          fromId: a.id,
          toId: b.id,
          value: dist,
          label: `${dist.toFixed(1)}`,
          from: { x: a.cx, y: a.cy },
          to: { x: b.cx, y: b.cy },
          midpoint: { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 },
        });
      }

      // Horizontal gap
      if (options.showGaps) {
        const hGap = Math.max(0, Math.max(b.minX - a.maxX, a.minX - b.maxX));
        if (hGap > 0) {
          const leftEl = a.cx < b.cx ? a : b;
          const rightEl = a.cx < b.cx ? b : a;
          const midY = (leftEl.cy + rightEl.cy) / 2;
          measurements.push({
            type: 'gap-h',
            fromId: leftEl.id,
            toId: rightEl.id,
            value: hGap,
            label: `↔ ${hGap.toFixed(1)}`,
            from: { x: leftEl.maxX, y: midY },
            to: { x: rightEl.minX, y: midY },
            midpoint: { x: (leftEl.maxX + rightEl.minX) / 2, y: midY },
          });
        }

        const vGap = Math.max(0, Math.max(b.minY - a.maxY, a.minY - b.maxY));
        if (vGap > 0) {
          const topEl = a.cy < b.cy ? a : b;
          const bottomEl = a.cy < b.cy ? b : a;
          const midX = (topEl.cx + bottomEl.cx) / 2;
          measurements.push({
            type: 'gap-v',
            fromId: topEl.id,
            toId: bottomEl.id,
            value: vGap,
            label: `↕ ${vGap.toFixed(1)}`,
            from: { x: midX, y: topEl.maxY },
            to: { x: midX, y: bottomEl.minY },
            midpoint: { x: midX, y: (topEl.maxY + bottomEl.minY) / 2 },
          });
        }
      }

      // Angle from center to center
      if (options.showAngles) {
        const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx) * (180 / Math.PI);
        const normalizedAngle = ((angle % 360) + 360) % 360;
        measurements.push({
          type: 'angle',
          fromId: a.id,
          toId: b.id,
          value: normalizedAngle,
          label: `${normalizedAngle.toFixed(1)}°`,
          from: { x: a.cx, y: a.cy },
          to: { x: b.cx, y: b.cy },
          midpoint: {
            x: a.cx + (b.cx - a.cx) * 0.2,
            y: a.cy + (b.cy - a.cy) * 0.2,
          },
        });
      }
    }
  }

  return measurements;
}
