import type { CanvasElement, Viewport } from '../../types';
import type { LayerInfo } from './slice';
import { getCanvasElementBounds } from '../../utils/canvasElementBounds';
import { getPathSubPathsInWorld, getSubPathsTightBounds } from '../../utils/pathWorldUtils';

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

const resolveElementMap = (
  elements: CanvasElement[],
  elementsSource?: ElementsSource
): Map<string, CanvasElement> => {
  if (elementsSource instanceof Map) return elementsSource;

  const source = elementsSource ?? elements;
  return new Map(source.map((element) => [element.id, element]));
};

const isVisiblePaint = (color: unknown, opacity: unknown): boolean => {
  if (typeof color !== 'string') return false;
  if (color === 'none' || color === 'transparent') return false;
  return typeof opacity === 'number' ? opacity > 0 : true;
};

const hasRenderableContent = (el: CanvasElement): boolean => {
  const data = el.data as Record<string, unknown>;
  if (data.isDefinition === true) return false;
  if (data.display === 'none' || data.visibility === 'hidden' || data.visibility === 'collapse') return false;
  if (typeof data.opacity === 'number' && data.opacity <= 0) return false;

  if (el.type === 'path') {
    return isVisiblePaint(data.fillColor, data.fillOpacity) || isVisiblePaint(data.strokeColor, data.strokeOpacity);
  }

  if (el.type === 'image') {
    return typeof data.width === 'number'
      && typeof data.height === 'number'
      && data.width > 0
      && data.height > 0
      && typeof data.href === 'string'
      && data.href.length > 0;
  }

  if (el.type === 'nativeText') {
    const text = typeof data.text === 'string' ? data.text : '';
    const spans = Array.isArray(data.spans) ? data.spans : [];
    return (text.length > 0 || spans.length > 0)
      && (isVisiblePaint(data.fillColor, data.fillOpacity) || isVisiblePaint(data.strokeColor, data.strokeOpacity));
  }

  if (el.type === 'nativeShape') {
    return isVisiblePaint(data.fillColor, data.fillOpacity) || isVisiblePaint(data.strokeColor, data.strokeOpacity);
  }

  return true;
};

export function getLayerDepthBBox(
  el: CanvasElement,
  viewport: Viewport,
  elementsSource: ElementsSource
): BBox | null {
  const elementMap = elementsSource instanceof Map
    ? elementsSource
    : new Map(elementsSource.map((element) => [element.id, element]));
  const bounds = el.type === 'path'
    ? getSubPathsTightBounds(getPathSubPathsInWorld(el, elementsSource))
    : getCanvasElementBounds(el, { viewport, elementMap });
  if (!bounds) return null;

  const { minX, minY, maxX, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    id: el.id,
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    area: width * height,
    hasFill: hasRenderableContent(el),
  };
}

function bboxOverlapArea(a: BBox, b: BBox): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return overlapX * overlapY;
}

export function analyzeLayerDepth(
  elements: CanvasElement[],
  viewport: Viewport,
  elementsSource?: ElementsSource
): LayerInfo[] {
  const bboxes: BBox[] = [];
  const elementMap = resolveElementMap(elements, elementsSource);
  for (const el of elements) {
    const bbox = getLayerDepthBBox(el, viewport, elementMap);
    if (bbox) bboxes.push(bbox);
  }

  const layers: LayerInfo[] = [];

  for (let i = 0; i < bboxes.length; i++) {
    const current = bboxes[i];
    const obscuredBy: string[] = [];
    let totalObscuredArea = 0;

    for (let j = i + 1; j < bboxes.length; j++) {
      const above = bboxes[j];
      if (!above.hasFill) continue;

      const overlap = bboxOverlapArea(current, above);
      if (overlap > 0) {
        obscuredBy.push(above.id);
        totalObscuredArea += overlap;
      }
    }

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
