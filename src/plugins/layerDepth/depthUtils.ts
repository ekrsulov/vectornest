import type { CanvasElement } from '../../types';
import type { LayerInfo } from './slice';
import { getPathSubPathsInWorld, getSubPathsBounds } from '../../utils/pathWorldUtils';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

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

function getPathBBox(el: CanvasElement, elementsSource: ElementsSource): BBox | null {
  if (el.type !== 'path') return null;
  const bounds = getSubPathsBounds(getPathSubPathsInWorld(el, elementsSource));
  if (!bounds) return null;
  const { minX, minY, maxX, maxY } = bounds;

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

export function analyzeLayerDepth(
  elements: CanvasElement[],
  elementsSource?: ElementsSource
): LayerInfo[] {
  // Elements are in render order (0 = bottommost, last = topmost)
  const bboxes: BBox[] = [];
  const worldSource = elementsSource ?? elements;
  for (const el of elements) {
    const bbox = getPathBBox(el, worldSource);
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
