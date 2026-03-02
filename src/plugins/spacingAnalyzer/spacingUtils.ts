import type { CanvasElement, Viewport } from '../../types';
import type { SpacingGap } from './slice';
import { getCanvasElementBounds } from '../../utils/canvasElementBounds';
import { getPathSubPathsInWorld, getSubPathsTightBounds } from '../../utils/pathWorldUtils';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

interface Bounds {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
}

function getBounds(
  el: CanvasElement,
  viewport: Viewport,
  elementsSource: ElementsSource
): Bounds | null {
  const elementMap = elementsSource instanceof Map
    ? elementsSource
    : new Map(elementsSource.map((element) => [element.id, element]));
  const bounds = el.type === 'path'
    ? getSubPathsTightBounds(getPathSubPathsInWorld(el, elementsSource))
    : getCanvasElementBounds(el, { viewport, elementMap });
  if (!bounds) return null;

  const { minX, minY, maxX, maxY } = bounds;
  return { id: el.id, minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function analyzeSpacing(
  elements: CanvasElement[],
  viewport: Viewport,
  elementsSource: ElementsSource,
  options: { showHorizontal: boolean; showVertical: boolean; inconsistencyThreshold: number }
): { gaps: SpacingGap[]; avgHGap: number; avgVGap: number } {
  const boundsList: Bounds[] = [];
  for (const el of elements) {
    const b = getBounds(el, viewport, elementsSource);
    if (b) boundsList.push(b);
  }

  const gaps: SpacingGap[] = [];

  if (options.showHorizontal) {
    const sorted = [...boundsList].sort((a, b) => a.minX - b.minX);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gap = b.minX - a.maxX;
      if (gap >= 0) {
        const midY = (a.cy + b.cy) / 2;
        gaps.push({
          fromId: a.id,
          toId: b.id,
          axis: 'horizontal',
          gap: Math.round(gap * 10) / 10,
          from: { x: a.maxX, y: midY },
          to: { x: b.minX, y: midY },
          midpoint: { x: (a.maxX + b.minX) / 2, y: midY },
          isInconsistent: false,
        });
      }
    }
  }

  if (options.showVertical) {
    const sorted = [...boundsList].sort((a, b) => a.minY - b.minY);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gap = b.minY - a.maxY;
      if (gap >= 0) {
        const midX = (a.cx + b.cx) / 2;
        gaps.push({
          fromId: a.id,
          toId: b.id,
          axis: 'vertical',
          gap: Math.round(gap * 10) / 10,
          from: { x: midX, y: a.maxY },
          to: { x: midX, y: b.minY },
          midpoint: { x: midX, y: (a.maxY + b.minY) / 2 },
          isInconsistent: false,
        });
      }
    }
  }

  const hGaps = gaps.filter((g) => g.axis === 'horizontal');
  const vGaps = gaps.filter((g) => g.axis === 'vertical');
  const avgHGap = hGaps.length > 0 ? hGaps.reduce((s, g) => s + g.gap, 0) / hGaps.length : 0;
  const avgVGap = vGaps.length > 0 ? vGaps.reduce((s, g) => s + g.gap, 0) / vGaps.length : 0;

  const threshold = options.inconsistencyThreshold;
  for (const g of hGaps) {
    g.isInconsistent = Math.abs(g.gap - avgHGap) > threshold;
  }
  for (const g of vGaps) {
    g.isInconsistent = Math.abs(g.gap - avgVGap) > threshold;
  }

  return {
    gaps,
    avgHGap: Math.round(avgHGap * 10) / 10,
    avgVGap: Math.round(avgVGap * 10) / 10,
  };
}
