import type { CanvasElement, Viewport } from '../../types';
import type { BBoxInfo, OverlapInfo } from './slice';
import { getCanvasElementBounds } from '../../utils/canvasElementBounds';
import { getPathSubPathsInWorld, getSubPathsTightBounds } from '../../utils/pathWorldUtils';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

const resolveElementMap = (
  elements: CanvasElement[],
  elementsSource?: ElementsSource
): Map<string, CanvasElement> => {
  if (elementsSource instanceof Map) return elementsSource;

  const source = elementsSource ?? elements;
  return new Map(source.map((element) => [element.id, element]));
};

export function computeBBoxes(
  elements: CanvasElement[],
  viewport: Viewport,
  elementsSource?: ElementsSource
): BBoxInfo[] {
  const result: BBoxInfo[] = [];
  const worldSource = elementsSource ?? elements;
  const elementMap = resolveElementMap(elements, elementsSource);

  for (const el of elements) {
    const bounds = el.type === 'path'
      ? getSubPathsTightBounds(getPathSubPathsInWorld(el, worldSource))
      : getCanvasElementBounds(el, { viewport, elementMap });
    if (!bounds) continue;
    const { minX, minY, maxX, maxY } = bounds;

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
