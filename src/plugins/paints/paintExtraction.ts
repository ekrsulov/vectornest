import type { CanvasElement } from '../../types';

export interface PaintInfo {
  value: string;
  normalizedValue: string;
  paintKey: string;
  opacity?: number;
  fillCount: number;
  strokeCount: number;
  totalCount: number;
  fillElementIds: string[];
  strokeElementIds: string[];
}

export interface ElementPaintData {
  id: string;
  type: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function normalizePaint(value: string | undefined): string {
  if (!value) return 'none';
  return value.trim().toLowerCase();
}

function formatDisplayPaintValue(value: string): string {
  const trimmed = value.trim();
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function getPaintKey(value: string, opacity: number | undefined, splitByOpacity: boolean): string {
  const normalizedValue = normalizePaint(value);
  if (splitByOpacity && opacity !== undefined && opacity !== 1) {
    return `${normalizedValue}@${opacity.toFixed(2)}`;
  }
  return normalizedValue;
}

function coerceString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function getPaintSources(data: Record<string, unknown>): Record<string, unknown>[] {
  const sources = [data];

  if (isRecord(data.styleOverrides)) {
    sources.push(data.styleOverrides);
  }
  if (isRecord(data.pathData)) {
    sources.push(data.pathData);
  }
  if (isRecord(data.cachedPathData)) {
    sources.push(data.cachedPathData);
  }
  if (isRecord(data.textPath)) {
    sources.push(data.textPath);
  }

  return sources;
}

function resolveField<T>(
  sources: Record<string, unknown>[],
  key: string,
  coerce: (value: unknown) => T | undefined
): T | undefined {
  for (const source of sources) {
    const resolved = coerce(source[key]);
    if (resolved !== undefined) {
      return resolved;
    }
  }
  return undefined;
}

export function resolveElementPaintData(element: CanvasElement): ElementPaintData {
  const data = isRecord(element.data) ? element.data : {};
  const sources = getPaintSources(data);

  return {
    id: element.id,
    type: element.type,
    fillColor: resolveField(sources, 'fillColor', coerceString),
    fillOpacity: resolveField(sources, 'fillOpacity', coerceNumber),
    strokeColor: resolveField(sources, 'strokeColor', coerceString),
    strokeOpacity: resolveField(sources, 'strokeOpacity', coerceNumber),
  };
}

export function extractPaintsFromPaintData(
  elements: ElementPaintData[],
  splitByOpacity: boolean
): PaintInfo[] {
  const paintMap = new Map<string, PaintInfo>();

  const addPaint = (
    color: string,
    opacity: number | undefined,
    elementId: string,
    type: 'fill' | 'stroke'
  ) => {
    const trimmedColor = color.trim();
    if (!trimmedColor) return;

    const displayColor = formatDisplayPaintValue(trimmedColor);
    const normalizedValue = normalizePaint(trimmedColor);
    const paintKey = getPaintKey(trimmedColor, opacity, splitByOpacity);
    const existing = paintMap.get(paintKey);

    if (existing) {
      existing[type === 'fill' ? 'fillCount' : 'strokeCount']++;
      existing.totalCount++;
      if (type === 'fill') {
        existing.fillElementIds.push(elementId);
      } else {
        existing.strokeElementIds.push(elementId);
      }
      return;
    }

    paintMap.set(paintKey, {
      value: displayColor,
      normalizedValue,
      paintKey,
      opacity,
      fillCount: type === 'fill' ? 1 : 0,
      strokeCount: type === 'stroke' ? 1 : 0,
      totalCount: 1,
      fillElementIds: type === 'fill' ? [elementId] : [],
      strokeElementIds: type === 'stroke' ? [elementId] : [],
    });
  };

  for (const element of elements) {
    if (element.type === 'group') continue;

    if (element.fillColor && element.fillColor !== 'none') {
      addPaint(
        element.fillColor,
        splitByOpacity ? (element.fillOpacity ?? 1) : undefined,
        element.id,
        'fill'
      );
    }

    if (element.strokeColor && element.strokeColor !== 'none') {
      addPaint(
        element.strokeColor,
        splitByOpacity ? (element.strokeOpacity ?? 1) : undefined,
        element.id,
        'stroke'
      );
    }
  }

  return Array.from(paintMap.values()).sort((a, b) => b.totalCount - a.totalCount);
}

export function extractPaints(elements: CanvasElement[], splitByOpacity: boolean): PaintInfo[] {
  return extractPaintsFromPaintData(
    elements
      .filter((element) => element.type !== 'group')
      .map((element) => resolveElementPaintData(element)),
    splitByOpacity
  );
}
