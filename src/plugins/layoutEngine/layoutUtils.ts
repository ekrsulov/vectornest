import type { Point } from '../../types';
import type { LayoutMode } from './slice';

export interface LayoutResult {
  /** Position offset for each element (indexed same as input) */
  positions: Point[];
  /** Rotation angle in degrees for each element (optional) */
  rotations: number[];
}

function circleLayout(
  count: number, radius: number, startAngle: number,
  cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];
  const startRad = (startAngle * Math.PI) / 180;

  for (let i = 0; i < count; i++) {
    const angle = startRad + (i / count) * Math.PI * 2;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
    rotations.push((angle * 180) / Math.PI + 90);
  }

  return { positions, rotations };
}

function gridLayout(
  count: number, spacing: number, columns: number,
  cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];
  const rows = Math.ceil(count / columns);
  const totalW = (columns - 1) * spacing;
  const totalH = (rows - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions.push({
      x: cx - totalW / 2 + col * spacing,
      y: cy - totalH / 2 + row * spacing,
    });
    rotations.push(0);
  }

  return { positions, rotations };
}

function waveLayout(
  count: number, spacing: number, frequency: number,
  amplitude: number, cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];
  const totalW = (count - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const x = cx - totalW / 2 + i * spacing;
    const t = count > 1 ? i / (count - 1) : 0;
    const y = cy + amplitude * Math.sin(t * frequency * Math.PI * 2);

    positions.push({ x, y });

    // Tangent angle
    const dt = 0.01;
    const tNext = Math.min(1, t + dt);
    const yNext = cy + amplitude * Math.sin(tNext * frequency * Math.PI * 2);
    const angle = Math.atan2(yNext - y, spacing * dt * (count - 1));
    rotations.push((angle * 180) / Math.PI);
  }

  return { positions, rotations };
}

function cascadeLayout(
  count: number, offsetX: number, offsetY: number,
  cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];
  const startX = cx - ((count - 1) * offsetX) / 2;
  const startY = cy - ((count - 1) * offsetY) / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + i * offsetX,
      y: startY + i * offsetY,
    });
    rotations.push(0);
  }

  return { positions, rotations };
}

function fanOutLayout(
  count: number, radius: number, startAngle: number,
  spread: number, cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];
  const startRad = (startAngle * Math.PI) / 180;
  const spreadRad = (spread * Math.PI) / 180;

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const angle = startRad + (t - 0.5) * spreadRad;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
    rotations.push((angle * 180) / Math.PI + 90);
  }

  return { positions, rotations };
}

function packLayout(
  count: number, radius: number,
  cx: number, cy: number
): LayoutResult {
  const positions: Point[] = [];
  const rotations: number[] = [];

  if (count === 0) return { positions, rotations };

  // Sunflower packing
  const golden = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * golden;

  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt(i / count);
    const theta = i * angleIncrement;
    positions.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    });
    rotations.push(0);
  }

  return { positions, rotations };
}

export function computeLayout(params: {
  count: number;
  mode: LayoutMode;
  spacing: number;
  startAngle: number;
  columns: number;
  waveFrequency: number;
  cascadeX: number;
  cascadeY: number;
  fanSpread: number;
  centerX: number;
  centerY: number;
}): LayoutResult {
  const {
    count, mode, spacing, startAngle, columns,
    waveFrequency, cascadeX, cascadeY, fanSpread,
    centerX, centerY,
  } = params;

  switch (mode) {
    case 'circle':
      return circleLayout(count, spacing, startAngle, centerX, centerY);
    case 'grid':
      return gridLayout(count, spacing, columns, centerX, centerY);
    case 'wave':
      return waveLayout(count, spacing * 0.5, waveFrequency, spacing, centerX, centerY);
    case 'cascade':
      return cascadeLayout(count, cascadeX, cascadeY, centerX, centerY);
    case 'fanOut':
      return fanOutLayout(count, spacing, startAngle, fanSpread, centerX, centerY);
    case 'pack':
      return packLayout(count, spacing, centerX, centerY);
  }
}
