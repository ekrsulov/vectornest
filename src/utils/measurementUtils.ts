import { DEFAULT_DPI, MEASUREMENT_CACHE_MAX_SIZE } from '../constants';
import { calculateRawCommandsBounds, calculateRawSubPathsBounds } from './rawBoundsUtils';

/** Axis-aligned bounding box. Canonical definition — also re-exported from boundsUtils. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Measurement utilities for path elements
// LRU cache for path measurements (bounded to prevent unbounded memory growth)
const MAX_MEASUREMENT_CACHE_SIZE = MEASUREMENT_CACHE_MAX_SIZE;
const pathMeasurementCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
const SVG_NS = 'http://www.w3.org/2000/svg';
const OFFSCREEN_OFFSET_PX = -9999;

// LRU cache for native text bounds measurements
const MAX_TEXT_MEASUREMENT_CACHE_SIZE = 200;
const textMeasurementCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

let textMeasurementSvg: SVGSVGElement | null = null;
let textMeasurementTextEl: SVGTextElement | null = null;

let measurementSvg: SVGSVGElement | null = null;
let measurementPath: SVGPathElement | null = null;

/**
 * Clear the path measurement cache.
 * Useful when bulk-modifying elements or freeing memory.
 */
export function clearMeasurementCache(): void {
  pathMeasurementCache.clear();
}

const ensureMeasurementPath = (): SVGPathElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  if (
    measurementSvg &&
    measurementPath &&
    measurementSvg.isConnected
  ) {
    return measurementPath;
  }

  measurementSvg = document.createElementNS(SVG_NS, 'svg');
  measurementSvg.style.position = 'absolute';
  measurementSvg.style.left = `${OFFSCREEN_OFFSET_PX}px`;
  measurementSvg.style.top = `${OFFSCREEN_OFFSET_PX}px`;
  measurementSvg.style.width = '1px';
  measurementSvg.style.height = '1px';
  measurementSvg.style.visibility = 'hidden';
  measurementSvg.style.pointerEvents = 'none';

  measurementPath = document.createElementNS(SVG_NS, 'path');
  measurementPath.setAttribute('stroke', '#000000');
  measurementPath.setAttribute('stroke-linecap', 'round');
  measurementPath.setAttribute('stroke-linejoin', 'round');
  measurementPath.setAttribute('fill', 'none');
  measurementSvg.appendChild(measurementPath);

  document.body.appendChild(measurementSvg);
  return measurementPath;
};

const estimatePathBounds = (
  subPaths: import('../types').SubPath[],
  strokeWidth: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const bounds = calculateRawSubPathsBounds(subPaths, {
    includeStroke: true,
    strokeWidth,
    zoom: 1,
  });
  if (!bounds) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return bounds;
};

const cacheMeasurementResult = (
  cacheKey: string,
  result: { minX: number; minY: number; maxX: number; maxY: number }
): void => {
  if (pathMeasurementCache.size >= MAX_MEASUREMENT_CACHE_SIZE) {
    const oldest = pathMeasurementCache.keys().next().value;
    if (oldest !== undefined) {
      pathMeasurementCache.delete(oldest);
    }
  }
  pathMeasurementCache.set(cacheKey, result);
};

// Function to measure path bounds using a ghost SVG element
export const measurePath = (
  subPaths: import('../types').SubPath[],
  strokeWidth: number = 1,
  _zoom?: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  // Generate d string from subPaths
  const d = subPaths.flat().map(cmd => {
    switch (cmd.type) {
      case 'M':
        return `M ${cmd.position.x} ${cmd.position.y}`;
      case 'L':
        return `L ${cmd.position.x} ${cmd.position.y}`;
      case 'C':
        return `C ${cmd.controlPoint1.x} ${cmd.controlPoint1.y} ${cmd.controlPoint2.x} ${cmd.controlPoint2.y} ${cmd.position.x} ${cmd.position.y}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');

  // zoom is intentionally excluded from the cache key: getBBox() returns
  // geometry-only bounds that are zoom-independent, so including zoom caused
  // unnecessary cache misses.
  const cacheKey = `${d}-${strokeWidth}`;

  // LRU lookup: delete+re-insert moves entry to end (most-recently-used)
  const cached = pathMeasurementCache.get(cacheKey);
  if (cached) {
    pathMeasurementCache.delete(cacheKey);
    pathMeasurementCache.set(cacheKey, cached);
    return cached;
  }

  const pathElement = ensureMeasurementPath();
  if (!pathElement) {
    const estimatedResult = estimatePathBounds(subPaths, strokeWidth);
    cacheMeasurementResult(cacheKey, estimatedResult);
    return estimatedResult;
  }

  pathElement.setAttribute('d', d);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());

  try {
    // Get bounding box from SVG (geometry only)
    const bbox = pathElement.getBBox();

    // Add stroke width to get the visual bounds
    const halfStroke = strokeWidth / 2;
    const result = {
      minX: bbox.x - halfStroke,
      minY: bbox.y - halfStroke,
      maxX: bbox.x + bbox.width + halfStroke,
      maxY: bbox.y + bbox.height + halfStroke,
    };

    cacheMeasurementResult(cacheKey, result);

    return result;
  } catch {
    const estimatedResult = estimatePathBounds(subPaths, strokeWidth);
    cacheMeasurementResult(cacheKey, estimatedResult);
    return estimatedResult;
  }
};

/**
 * Measure bounds of a subpath from commands
 * Unifies the logic previously duplicated in Canvas, CanvasRenderer, and subpathPluginSlice
 */
export const measureSubpathBounds = (
  commands: import('../types').Command[],
  strokeWidth: number = 1,
  zoom: number = 1
): { minX: number; minY: number; maxX: number; maxY: number } => {
  // Convert commands to subpath format for measurePath
  const subPaths = [commands];
  return measurePath(subPaths, strokeWidth, zoom);
};

/**
 * Calculate simple bounding box from commands (without stroke)
 * This is a lightweight alternative to measurePath that doesn't use DOM
 * Used primarily for UI purposes like thumbnails and coordinate display
 * 
 * @param commands - Array of path commands
 * @returns Bounding box coordinates or null if no commands
 */
export const measureCommandsBounds = (
  commands: import('../types').Command[]
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  return calculateRawCommandsBounds(commands);
};

/**
 * Measure native text bounds using an offscreen SVG.
 * Results are cached by a key derived from the input properties.
 */
import type { NativeTextElement } from '../plugins/nativeText/types';

export const measureNativeTextBounds = (
  data: NativeTextElement['data']
): { minX: number; minY: number; maxX: number; maxY: number } => {
  // Build a cache key from the properties that affect text measurement
  const spansKey = data.spans ? data.spans.map(s => `${s.text}|${s.line}|${s.fontWeight ?? ''}|${s.fontStyle ?? ''}|${s.fontSize ?? ''}`).join(';') : data.text;
  // Add textTransform and dominantBaseline to cache key for accuracy
  const cacheKey = `${data.x}|${data.y}|${spansKey}|${data.fontSize}|${data.fontFamily}|${data.fontWeight ?? ''}|${data.fontStyle ?? ''}|${data.letterSpacing ?? ''}|${data.textAnchor ?? ''}|${data.strokeWidth ?? 0}|${data.lineHeight ?? ''}|${data.writingMode ?? ''}|${data.textTransform ?? ''}|${data.dominantBaseline ?? ''}`;

  const cached = textMeasurementCache.get(cacheKey);
  if (cached) {
    // LRU: move to end
    textMeasurementCache.delete(cacheKey);
    textMeasurementCache.set(cacheKey, cached);
    return cached;
  }
  const svg = (() => {
    if (textMeasurementSvg && textMeasurementSvg.isConnected) {
      // Clear previous text element contents
      if (textMeasurementTextEl) {
        textMeasurementTextEl.remove();
      }
    } else {
      textMeasurementSvg = document.createElementNS(SVG_NS, 'svg');
      textMeasurementSvg.style.position = 'absolute';
      textMeasurementSvg.style.left = `${OFFSCREEN_OFFSET_PX}px`;
      textMeasurementSvg.style.top = `${OFFSCREEN_OFFSET_PX}px`;
      textMeasurementSvg.style.visibility = 'hidden';
      document.body.appendChild(textMeasurementSvg);
    }
    return textMeasurementSvg;
  })();
  const textEl = document.createElementNS(SVG_NS, 'text');
  textMeasurementTextEl = textEl;
  textEl.setAttribute('x', data.x.toString());
  textEl.setAttribute('y', data.y.toString());
  textEl.setAttribute('font-size', data.fontSize.toString());
  textEl.setAttribute('font-family', data.fontFamily);
  if (data.fontWeight) textEl.setAttribute('font-weight', data.fontWeight);
  if (data.fontStyle) textEl.setAttribute('font-style', data.fontStyle);
  if (data.textDecoration && data.textDecoration !== 'none') textEl.setAttribute('text-decoration', data.textDecoration);
  if (data.letterSpacing !== undefined) textEl.setAttribute('letter-spacing', data.letterSpacing.toString());
  // Always set textTransform and dominantBaseline, even if 'none', to match SVG rendering
  textEl.setAttribute('text-transform', data.textTransform ?? 'none');
  textEl.setAttribute('dominant-baseline', data.dominantBaseline ?? 'alphabetic');
  if (data.textLength !== undefined) {
    textEl.setAttribute('textLength', data.textLength.toString());
    textEl.setAttribute('lengthAdjust', data.lengthAdjust ?? 'spacing');
  }

  // Apply textTransform to the text content for measurement
  function applyTextTransform(str: string, transform?: string) {
    if (!transform || transform === 'none') return str;
    if (transform === 'uppercase') return str.toUpperCase();
    if (transform === 'lowercase') return str.toLowerCase();
    if (transform === 'capitalize') return str.replace(/\b\w/g, c => c.toUpperCase());
    return str;
  }
  textEl.setAttribute('fill', data.fillColor ?? '#000');
  if (data.fillOpacity !== undefined) textEl.setAttribute('fill-opacity', data.fillOpacity.toString());
  textEl.setAttribute('stroke', data.strokeColor ?? 'none');
  textEl.setAttribute('stroke-width', (data.strokeWidth ?? 0).toString());
  if (data.strokeOpacity !== undefined) textEl.setAttribute('stroke-opacity', data.strokeOpacity.toString());
  if (data.strokeLinecap) textEl.setAttribute('stroke-linecap', data.strokeLinecap);
  if (data.strokeLinejoin) textEl.setAttribute('stroke-linejoin', data.strokeLinejoin);
  if (data.strokeDasharray && data.strokeDasharray !== 'none') textEl.setAttribute('stroke-dasharray', data.strokeDasharray);
  if (data.textAnchor) textEl.setAttribute('text-anchor', data.textAnchor);
  if (data.writingMode && data.writingMode !== 'horizontal-tb') textEl.setAttribute('writing-mode', data.writingMode);

  const lineHeight = data.lineHeight ?? 1.2;
  if (data.spans && data.spans.length > 0) {
    data.spans.forEach((span, idx) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      if (idx === 0 || span.line !== data.spans![idx - 1].line) {
        tspan.setAttribute('x', data.x.toString());
        if (span.line > 0) {
          const prevLine = data.spans![idx - 1]?.line ?? 0;
          const delta = span.line - prevLine;
          tspan.setAttribute('dy', (data.fontSize * lineHeight * delta).toString());
        }
      }
      if (span.fontWeight) tspan.setAttribute('font-weight', span.fontWeight);
      if (span.fontStyle) tspan.setAttribute('font-style', span.fontStyle);
      if (span.fontSize) tspan.setAttribute('font-size', span.fontSize.toString());
      if (span.textDecoration && span.textDecoration !== 'none') tspan.setAttribute('text-decoration', span.textDecoration);
      if (span.fillColor) tspan.setAttribute('fill', span.fillColor);
      tspan.textContent = applyTextTransform(span.text || ' ', data.textTransform);
      textEl.appendChild(tspan);
    });
  } else {
    const lines = (data.text || '').split(/\r?\n/);
    lines.forEach((line, idx) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', data.x.toString());
      if (idx > 0) {
        tspan.setAttribute('dy', (data.fontSize * lineHeight).toString());
      }
      tspan.textContent = applyTextTransform(line || ' ', data.textTransform);
      textEl.appendChild(tspan);
    });
  }

  svg.appendChild(textEl);
  const bbox = textEl.getBBox();
  const result = { minX: bbox.x, minY: bbox.y, maxX: bbox.x + bbox.width, maxY: bbox.y + bbox.height };

  // Cache the result (LRU eviction)
  if (textMeasurementCache.size >= MAX_TEXT_MEASUREMENT_CACHE_SIZE) {
    const oldest = textMeasurementCache.keys().next().value;
    if (oldest !== undefined) textMeasurementCache.delete(oldest);
  }
  textMeasurementCache.set(cacheKey, result);

  return result;
};

/**
 * Accumulate bounding boxes from multiple command sets
 * Centralizes the logic that was duplicated in Canvas and transformationPluginSlice
 */
export const accumulateBounds = (
  commandsList: import('../types').Command[][],
  strokeWidth: number,
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  const boundsList = commandsList.map((commands) => measurePath([commands], strokeWidth, zoom));
  return mergeBounds(boundsList);
};

/**
 * Format distance value based on units and precision
 */
export function formatDistance(value: number, units: 'px' | 'mm' | 'in', precision: number): string {
  switch (units) {
    case 'mm':
      // Convert pixels to mm using the shared DPI constant.
      return `${(value * 25.4 / DEFAULT_DPI).toFixed(precision)} mm`;
    case 'in':
      // Convert pixels to inches using the shared DPI constant.
      return `${(value / DEFAULT_DPI).toFixed(precision)} in`;
    case 'px':
    default:
      return `${value.toFixed(precision)} px`;
  }
}

export function formatAngle(angle: number, precision: number): string {
  return `${angle.toFixed(precision)}°`;
}


/**
 * Merge multiple bounding boxes into one
 */
export function mergeBounds(
  boundsList: { minX: number; minY: number; maxX: number; maxY: number }[]
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (boundsList.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasValidBounds = false;

  for (const bounds of boundsList) {
    if (!bounds) continue;
    hasValidBounds = true;
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  if (!hasValidBounds || minX === Infinity) return null;

  return { minX, minY, maxX, maxY };
}
