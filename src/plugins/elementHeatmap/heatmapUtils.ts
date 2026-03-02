import type { CanvasElement, Viewport } from '../../types';
import type { HeatmapCell } from './slice';
import { getCanvasElementBounds } from '../../utils/canvasElementBounds';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

const resolveElementMap = (
  elements: CanvasElement[],
  elementsSource?: ElementsSource
): Map<string, CanvasElement> => {
  if (elementsSource instanceof Map) return elementsSource;

  const source = elementsSource ?? elements;
  return new Map(source.map((element) => [element.id, element]));
};

export function computeHeatmap(
  elements: CanvasElement[],
  viewport: Viewport,
  gridSize: number,
  elementsSource?: ElementsSource
): HeatmapCell[] {
  const elementMap = resolveElementMap(elements, elementsSource);
  const centers: { x: number; y: number }[] = [];
  for (const el of elements) {
    const bounds = getCanvasElementBounds(el, { viewport, elementMap });
    if (!bounds) continue;

    centers.push({
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    });
  }

  if (centers.length === 0) return [];

  // Find bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of centers) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }

  const cols = Math.ceil((maxX - minX + 1) / gridSize) + 1;
  const rows = Math.ceil((maxY - minY + 1) / gridSize) + 1;

  // Count elements per cell
  const grid = new Map<string, number>();
  let maxCount = 0;

  for (const c of centers) {
    const col = Math.floor((c.x - minX) / gridSize);
    const row = Math.floor((c.y - minY) / gridSize);
    const key = `${col},${row}`;
    const count = (grid.get(key) ?? 0) + 1;
    grid.set(key, count);
    if (count > maxCount) maxCount = count;
  }

  if (maxCount === 0) return [];

  const cells: HeatmapCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const count = grid.get(`${col},${row}`) ?? 0;
      if (count > 0) {
        cells.push({
          x: minX + col * gridSize,
          y: minY + row * gridSize,
          count,
          intensity: count / maxCount,
        });
      }
    }
  }

  return cells;
}
