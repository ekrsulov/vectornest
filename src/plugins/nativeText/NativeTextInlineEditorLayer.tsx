import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { isTouchDevice } from '../../utils/domHelpers';
import type { InlineTextEditSlice } from './inlineEditSlice';
import type { NativeTextElement } from './types';
import {
  buildRichTextFromPlainTextAndSpans,
  buildSpansPreservingGlyphTransforms,
} from './inlineTextSpanUtils';
import {
  createContentEditableRangeFromOffsets,
  getContentEditableSelectionOffsets,
} from '../../utils/contentEditableSelection';
import { parseColorOpacity } from '../../utils/svg/parser';
import { measureNativeTextBounds } from '../../utils/measurementUtils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import {
  computeNativeTextTransformAttr,
  getNativeTextEditorBox,
  isVerticalWritingMode,
} from './nativeTextEditorGeometry';

type EditableSpan = NonNullable<NativeTextElement['data']['spans']>[number];
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type EditableVisualSpan = EditableSpan & { editorLine: number };
type GlyphMetric = {
  originX: number;
  originY: number;
  boxX: number;
  boxY: number;
  svgStartX: number;
  htmlBoxX: number;
  htmlBoxY: number;
  htmlStartX: number;
  svgBaselineY: number;
  htmlBaselineY: number;
};

const DEFAULT_GLYPH_METRIC: GlyphMetric = {
  originX: 0,
  originY: 0,
  boxX: 0,
  boxY: 0,
  svgStartX: 0,
  htmlBoxX: 0,
  htmlBoxY: 0,
  htmlStartX: 0,
  svgBaselineY: 0,
  htmlBaselineY: 0,
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const INLINE_EDITOR_LINE_HEIGHT = 1;
const INLINE_SELECTION_TRAVERSAL_OPTIONS = {
  isIgnoredNode: (node: Node) => (
    node instanceof Element && node.getAttribute('data-inline-line-baseline') === '1'
  ),
  isLineContainer: (element: Element) => element.hasAttribute('data-inline-line'),
  isBlockElement: () => false,
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseNumberList = (value?: string): number[] => {
  if (!value || !value.trim()) return [];
  return value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
};

const getRotateValueForGlyph = (values: number[], index: number): number => {
  if (values.length === 0) return 0;
  return values[index] ?? values[values.length - 1] ?? 0;
};

const clampOpacity = (value: number): number => Math.min(1, Math.max(0, value));

const parseRgbComponents = (value: string): [number, number, number] | null => {
  const rgbMatch = value.match(/^rgb\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  const hexMatch = value.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1].length === 3
    ? hexMatch[1].split('').map((char) => `${char}${char}`).join('')
    : hexMatch[1];

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
};

const resolveCssColorWithOpacity = (color?: string, opacity?: number): string | undefined => {
  if (!color || color === 'none') {
    return undefined;
  }

  const { color: parsedColor, opacity: parsedOpacity } = parseColorOpacity(color);
  const baseColor = parsedColor ?? color;
  const effectiveOpacity = clampOpacity((opacity ?? 1) * (parsedOpacity ?? 1));

  if (effectiveOpacity >= 1) {
    return baseColor;
  }

  const rgb = parseRgbComponents(baseColor);
  if (!rgb) {
    return baseColor;
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${effectiveOpacity})`;
};

const serializeStyle = (style: Record<string, string | number | undefined>) => Object.entries(style)
  .filter(([, value]) => value !== undefined && value !== '')
  .map(([key, value]) => `${key}:${String(value)}`)
  .join(';');

const normalizeLineSpans = (data: NativeTextElement['data']): EditableSpan[] => {
  if (data.spans && data.spans.length > 0) {
    return data.spans;
  }

  return (data.text ?? '').split(/\r?\n/).map((lineText, lineIndex) => ({
    text: lineText,
    line: lineIndex,
    fontWeight: data.fontWeight ?? undefined,
    fontStyle: data.fontStyle ?? undefined,
    textDecoration: data.textDecoration ?? undefined,
    fillColor: data.fillColor ?? undefined,
  }));
};

const resolveVisualSpans = (data: NativeTextElement['data']): EditableVisualSpan[] => {
  const spans = normalizeLineSpans(data);
  let currentEditorLine = 0;

  return spans.map((span, index) => {
    if (index === 0) {
      return { ...span, editorLine: currentEditorLine };
    }

    const previousSpan = spans[index - 1];
    const sameDeclaredLine = span.line === previousSpan.line;
    const hasMeaningfulDy = parseNumberList(span.dy).some((value) => value !== 0);
    const shouldStartNewVisualLine = span.line > previousSpan.line || (sameDeclaredLine && hasMeaningfulDy);

    if (shouldStartNewVisualLine) {
      currentEditorLine += 1;
    }

    return { ...span, editorLine: currentEditorLine };
  });
};

const mergeBounds = (current: Bounds | undefined, next: DOMRect): Bounds => {
  if (!current) {
    return {
      minX: next.x,
      minY: next.y,
      maxX: next.x + next.width,
      maxY: next.y + next.height,
    };
  }

  return {
    minX: Math.min(current.minX, next.x),
    minY: Math.min(current.minY, next.y),
    maxX: Math.max(current.maxX, next.x + next.width),
    maxY: Math.max(current.maxY, next.y + next.height),
  };
};

const findPreviousVisualSpan = (
  spans: EditableVisualSpan[],
  editorLine: number,
): EditableVisualSpan | undefined => {
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const candidate = spans[index];
    if (candidate && candidate.editorLine < editorLine) {
      return candidate;
    }
  }

  return undefined;
};

const resolveSpanDy = (
  span: EditableVisualSpan,
  spans: EditableVisualSpan[],
  data: NativeTextElement['data'],
): string | undefined => {
  if (span.dy) return span.dy;
  if (span.editorLine <= 0) return undefined;

  const previousSpan = findPreviousVisualSpan(spans, span.editorLine);
  const previousEditorLine = previousSpan?.editorLine ?? (span.editorLine - 1);
  const delta = span.editorLine - previousEditorLine;
  const lineHeight = data.lineHeight ?? 1.2;
  return String(data.fontSize * lineHeight * delta);
};

const createMeasurementText = (
  svg: SVGSVGElement,
  data: NativeTextElement['data'],
  spans: EditableVisualSpan[],
  includeRotate: boolean,
) => {
  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', String(data.x));
  textEl.setAttribute('y', String(data.y));
  textEl.setAttribute('font-size', String(data.fontSize));
  textEl.setAttribute('font-family', data.fontFamily);
  textEl.setAttribute('font-weight', data.fontWeight ?? 'normal');
  textEl.setAttribute('font-style', data.fontStyle ?? 'normal');
  textEl.setAttribute('text-decoration', data.textDecoration ?? 'none');
  textEl.setAttribute('text-anchor', data.textAnchor ?? 'start');
  textEl.setAttribute('dominant-baseline', data.dominantBaseline ?? 'alphabetic');
  if (data.letterSpacing !== undefined) textEl.setAttribute('letter-spacing', String(data.letterSpacing));
  if (data.writingMode && data.writingMode !== 'horizontal-tb') textEl.setAttribute('writing-mode', data.writingMode);
  if (data.direction) textEl.setAttribute('direction', data.direction);
  if (data.unicodeBidi) textEl.setAttribute('unicode-bidi', data.unicodeBidi);

  spans.forEach((span, index) => {
    const previousSpan = index > 0 ? spans[index - 1] : undefined;
    const isLineStart = index === 0 || span.editorLine !== previousSpan?.editorLine;
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    if (isLineStart) {
      tspan.setAttribute('x', String(data.x));
    }
    const dyValue = resolveSpanDy(span, spans, data);
    if (dyValue) tspan.setAttribute('dy', dyValue);
    if (span.dx) tspan.setAttribute('dx', span.dx);
    if (includeRotate && span.rotate) tspan.setAttribute('rotate', span.rotate);
    if (span.fontWeight) tspan.setAttribute('font-weight', span.fontWeight);
    if (span.fontStyle) tspan.setAttribute('font-style', span.fontStyle);
    if (span.fontSize) tspan.setAttribute('font-size', String(span.fontSize));
    if (span.textDecoration && span.textDecoration !== 'none') tspan.setAttribute('text-decoration', span.textDecoration);
    if (span.fillColor) tspan.setAttribute('fill', span.fillColor);
    tspan.textContent = span.text || ' ';
    textEl.appendChild(tspan);
  });

  svg.appendChild(textEl);
  return textEl;
};

const measureHtmlGlyphBoxes = (
  data: NativeTextElement['data'],
  spans: EditableVisualSpan[],
): {
  glyphs: Array<{ left: number; top: number; startX: number }>;
  lineBaselines: Map<number, number>;
} => {
  if (typeof document === 'undefined') {
    return { glyphs: [], lineBaselines: new Map() };
  }

  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = '-100000px';
  host.style.top = '-100000px';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.whiteSpace = 'pre';
  host.style.fontFamily = data.fontFamily;
  host.style.fontSize = `${data.fontSize}px`;
  host.style.fontWeight = data.fontWeight ?? 'normal';
  host.style.fontStyle = data.fontStyle ?? 'normal';
  host.style.lineHeight = String(INLINE_EDITOR_LINE_HEIGHT);
  if (data.letterSpacing !== undefined) {
    host.style.letterSpacing = `${data.letterSpacing}px`;
  }
  if (data.direction) {
    host.style.direction = data.direction;
  }
  const verticalWritingMode = isVerticalWritingMode(data.writingMode)
    ? data.writingMode as React.CSSProperties['writingMode']
    : undefined;
  if (verticalWritingMode) {
    host.style.writingMode = verticalWritingMode;
  }

  const charNodes: Array<{ wrapper: HTMLSpanElement; glyph: HTMLSpanElement; line: number }> = [];
  const lines = new Map<number, HTMLDivElement>();
  const lineBaselineMarkers = new Map<number, HTMLSpanElement>();

  spans.forEach((span) => {
    let lineNode = lines.get(span.editorLine);
    if (!lineNode) {
      lineNode = document.createElement('div');
      lineNode.style.display = 'block';
      lineNode.style.width = 'max-content';
      lineNode.style.position = 'relative';
      lines.set(span.editorLine, lineNode);
      host.appendChild(lineNode);

      const lineBaseline = document.createElement('span');
      lineBaseline.style.display = 'inline-block';
      lineBaseline.style.width = '0';
      lineBaseline.style.height = '1px';
      lineBaseline.style.padding = '0';
      lineBaseline.style.margin = '0';
      lineBaseline.style.overflow = 'hidden';
      lineBaseline.style.verticalAlign = 'baseline';
      lineBaselineMarkers.set(span.editorLine, lineBaseline);
    }

    for (let index = 0; index < span.text.length; index += 1) {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline-block';
      wrapper.style.whiteSpace = 'pre';
      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'visible';

      const glyph = document.createElement('span');
      glyph.style.display = 'inline-block';
      glyph.style.whiteSpace = 'pre';
      glyph.style.lineHeight = '1';
      glyph.style.overflow = 'visible';
      if (span.fontWeight) glyph.style.fontWeight = span.fontWeight;
      if (span.fontStyle) glyph.style.fontStyle = span.fontStyle;
      if (span.textDecoration && span.textDecoration !== 'none') glyph.style.textDecoration = span.textDecoration;
      glyph.textContent = span.text[index] === ' ' ? '\u00A0' : span.text[index] ?? '';

      wrapper.appendChild(glyph);
      lineNode.appendChild(wrapper);
      charNodes.push({ wrapper, glyph, line: span.editorLine });
    }

    if (span.text.length === 0) {
      const empty = document.createElement('span');
      empty.innerHTML = '<br>';
      lineNode.appendChild(empty);
    }
  });

  lineBaselineMarkers.forEach((marker, line) => {
    const lineNode = lines.get(line);
    lineNode?.appendChild(marker);
  });

  document.body.appendChild(host);

  const lineBaselines = new Map<number, number>();
  lineBaselineMarkers.forEach((marker, line) => {
    const lineNode = lines.get(line);
    const lineRect = lineNode?.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    lineBaselines.set(line, lineRect ? markerRect.bottom - lineRect.top : 0);
  });

  const glyphs = charNodes.map(({ wrapper, glyph, line }) => {
    const lineNode = lines.get(line) ?? null;
    const wrapperRect = wrapper.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    const lineRect = lineNode?.getBoundingClientRect();
    return {
      left: lineRect ? glyphRect.left - lineRect.left : 0,
      top: lineRect ? glyphRect.top - lineRect.top : 0,
      startX: lineRect ? wrapperRect.left - lineRect.left : 0,
    };
  });

  host.remove();
  return { glyphs, lineBaselines };
};

const measureTextLayout = (
  data: NativeTextElement['data'],
): { lineBoxes: Map<number, Bounds>; glyphMetrics: GlyphMetric[] } => {
  if (typeof document === 'undefined') {
    return { lineBoxes: new Map(), glyphMetrics: [] };
  }

  const spans = resolveVisualSpans(data);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.position = 'absolute';
  svg.style.left = '-100000px';
  svg.style.top = '-100000px';
  svg.style.visibility = 'hidden';
  const baseTextEl = createMeasurementText(svg, data, spans, false);
  document.body.appendChild(svg);
  const { glyphs: htmlGlyphBoxes, lineBaselines } = measureHtmlGlyphBoxes(data, spans);

  const lineBoxes = new Map<number, Bounds>();
  const glyphMetrics: GlyphMetric[] = [];

  Array.from(baseTextEl.children).forEach((node, index) => {
    if (!(node instanceof SVGTextPositioningElement)) return;
    const span = spans[index];
    if (!span) return;
    const bbox = node.getBBox();
    if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y)) return;
    lineBoxes.set(span.editorLine, mergeBounds(lineBoxes.get(span.editorLine), bbox));
  });

  let glyphIndex = 0;
  spans.forEach((span) => {
    for (let charIndex = 0; charIndex < span.text.length; charIndex += 1) {
      try {
        const baseExtent = baseTextEl.getExtentOfChar(glyphIndex);
        const start = baseTextEl.getStartPositionOfChar(glyphIndex);
        const htmlBox = htmlGlyphBoxes[glyphIndex] ?? { left: 0, top: 0, startX: 0 };
        const lineBox = lineBoxes.get(span.editorLine);
        const boxX = lineBox ? baseExtent.x - lineBox.minX : 0;
        const boxY = lineBox ? baseExtent.y - lineBox.minY : 0;
        const htmlLineBaselineY = lineBaselines.get(span.editorLine) ?? data.fontSize;
        glyphMetrics.push({
          originX: 0,
          originY: htmlLineBaselineY - htmlBox.top,
          boxX,
          boxY,
          svgStartX: lineBox ? start.x - lineBox.minX : 0,
          htmlBoxX: htmlBox.left,
          htmlBoxY: htmlBox.top,
          htmlStartX: htmlBox.startX,
          svgBaselineY: boxY + (start.y - baseExtent.y),
          htmlBaselineY: htmlLineBaselineY,
        });
      } catch {
        glyphMetrics.push({
          originX: 0,
          originY: data.fontSize,
          boxX: 0,
          boxY: 0,
          svgStartX: 0,
          htmlBoxX: 0,
          htmlBoxY: 0,
          htmlStartX: 0,
          svgBaselineY: data.fontSize,
          htmlBaselineY: data.fontSize,
        });
      }
      glyphIndex += 1;
    }
  });

  svg.remove();
  return { lineBoxes, glyphMetrics };
};

const computeDesiredLineOffsets = (
  data: NativeTextElement['data'],
  bounds: Bounds,
  lineBoxes: Map<number, Bounds>,
  glyphMetrics: GlyphMetric[],
  paddingX: number,
  paddingY: number,
) => {
  const spans = resolveVisualSpans(data);
  const lineBaselineOffsets = new Map<number, { svgBaselineY: number; htmlBaselineY: number }>();
  let glyphCursor = 0;
  const lineBaseOffsetX = isVerticalWritingMode(data.writingMode)
    ? 0
    : Math.max(0, data.x - bounds.minX);

  spans.forEach((span) => {
    for (let index = 0; index < span.text.length; index += 1) {
      const glyphMetric = glyphMetrics[glyphCursor] ?? DEFAULT_GLYPH_METRIC;
      if (!lineBaselineOffsets.has(span.editorLine)) {
        lineBaselineOffsets.set(span.editorLine, {
          svgBaselineY: glyphMetric.svgBaselineY,
          htmlBaselineY: glyphMetric.htmlBaselineY,
        });
      }
      glyphCursor += 1;
    }
  });

  const lineIndices = Array.from(new Set(spans.map((span) => span.editorLine))).sort((left, right) => left - right);
  return new Map(lineIndices.map((lineIndex, index) => {
    const lineBounds = lineBoxes.get(lineIndex);
    const baselineOffsets = lineBaselineOffsets.get(lineIndex);
    const leftOffset = lineBounds
      ? Math.max(paddingX, lineBounds.minX - bounds.minX + paddingX)
      : paddingX + lineBaseOffsetX;
    const naturalTopOffset = paddingY + index * data.fontSize * INLINE_EDITOR_LINE_HEIGHT;
    const lineTopOffset = lineBounds
      ? (lineBounds.minY - bounds.minY + paddingY)
      : naturalTopOffset;
    const desiredTopOffset = lineBounds ? lineTopOffset : paddingY;
    const desiredBaselineY = desiredTopOffset + (baselineOffsets?.htmlBaselineY ?? 0);

    return [lineIndex, {
      leftOffset,
      naturalTopOffset,
      desiredTopOffset,
      desiredBaselineY,
    }];
  }));
};

const measureLiveEditorOffsets = (
  editor: HTMLDivElement,
  zoom: number,
): Map<number, { left: number; top: number; baseline: number }> => {
  const editorRect = editor.getBoundingClientRect();
  const contentOriginX = editorRect.left + editor.clientLeft;
  const contentOriginY = editorRect.top + editor.clientTop;
  const lineNodes = Array.from(editor.querySelectorAll('[data-inline-line]')) as HTMLDivElement[];
  const safeZoom = zoom > 0 ? zoom : 1;
  return new Map(lineNodes.map((lineNode) => {
    const value = Number(lineNode.dataset.inlineLine ?? '-1');
    const rect = lineNode.getBoundingClientRect();
    const baselineMarker = lineNode.querySelector('[data-inline-line-baseline="1"]') as HTMLSpanElement | null;
    const baselineRect = baselineMarker?.getBoundingClientRect();
    return [value, {
      left: (rect.left - contentOriginX) / safeZoom,
      top: (rect.top - contentOriginY) / safeZoom,
      baseline: baselineRect
        ? (baselineRect.bottom - contentOriginY) / safeZoom
        : (rect.top - contentOriginY) / safeZoom,
    }];
  }));
};

const buildInitialEditorHtml = (
  data: NativeTextElement['data'],
  bounds: Bounds,
  lineBoxes: Map<number, Bounds>,
  glyphMetrics: GlyphMetric[],
  paddingX: number,
  paddingY: number,
  globalOffsetX: number = 0,
  globalOffsetY: number = 0,
): string => {
  const spans = resolveVisualSpans(data);
  const lines = new Map<number, string[]>();
  const desiredLineOffsets = computeDesiredLineOffsets(data, bounds, lineBoxes, glyphMetrics, paddingX, paddingY);
  const strokeWidth = data.strokeWidth ?? 0;
  const strokeColor = resolveCssColorWithOpacity(data.strokeColor, data.strokeOpacity);
  let glyphCursor = 0;

  spans.forEach((span) => {
    const fragments = lines.get(span.editorLine) ?? [];
    const rotateValues = parseNumberList(span.rotate);

    for (let index = 0; index < span.text.length; index += 1) {
      const character = span.text[index];
      const glyphMetric = glyphMetrics[glyphCursor] ?? DEFAULT_GLYPH_METRIC;
      const rotate = getRotateValueForGlyph(rotateValues, index);
      // Use the measured delta between the SVG glyph layout and the natural HTML
      // inline flow. This already captures per-glyph dx/dy offsets, so adding the
      // parsed SVG values again would double-apply moved glyph positions.
      const relativeDx = glyphMetric.svgStartX - glyphMetric.htmlStartX;
      const relativeDy = glyphMetric.svgBaselineY - glyphMetric.htmlBaselineY;
      const transforms: string[] = [];
      if (relativeDx !== 0 || relativeDy !== 0) {
        transforms.push(`translate(${relativeDx}px, ${relativeDy}px)`);
      }
      const wrapperStyle = serializeStyle({
        display: 'inline-block',
        'white-space': 'pre',
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
        'transform-origin': transforms.length > 0 ? '0 0' : undefined,
        position: 'relative',
        overflow: 'visible',
      });
      const glyphStyle = serializeStyle({
        display: 'inline-block',
        'white-space': 'pre',
        'font-weight': span.fontWeight,
        'font-style': span.fontStyle,
        'text-decoration': span.textDecoration !== 'none' ? span.textDecoration : undefined,
        color: span.fillColor,
        '-webkit-text-stroke-width': strokeWidth > 0 ? `${strokeWidth}px` : undefined,
        '-webkit-text-stroke-color': strokeColor,
        transform: rotate !== 0 ? `rotate(${rotate}deg)` : undefined,
        'transform-origin': rotate !== 0 ? `${glyphMetric.originX}px ${glyphMetric.originY}px` : undefined,
        'line-height': '1',
        overflow: 'visible',
      });
      fragments.push(
        `<span${wrapperStyle ? ` style="${wrapperStyle}"` : ''}><span data-inline-glyph="1"${glyphStyle ? ` style="${glyphStyle}"` : ''}>${escapeHtml(character === ' ' ? '\u00A0' : character)}</span></span>`
      );
      glyphCursor += 1;
    }

    if (span.text.length === 0) {
      fragments.push('<span><br></span>');
    }

    lines.set(span.editorLine, fragments);
  });

  const lineIndices = Array.from(lines.keys()).sort((left, right) => left - right);
  if (lineIndices.length === 0) {
    return '<div data-inline-line="0"><br></div>';
  }

  return lineIndices
    .map((lineIndex) => {
      const desiredOffset = desiredLineOffsets.get(lineIndex);
      const leftOffset = desiredOffset?.leftOffset ?? paddingX;
      const naturalTopOffset = desiredOffset?.naturalTopOffset ?? paddingY;
      const desiredTopOffset = desiredOffset?.desiredTopOffset ?? paddingY;
      const relativeTopOffset = desiredTopOffset - naturalTopOffset;
      const relativeLeftOffset = leftOffset - paddingX;
      const lineStyle = serializeStyle({
        display: 'block',
        width: 'max-content',
        transform: `translate(${relativeLeftOffset + globalOffsetX}px, ${relativeTopOffset + globalOffsetY}px)`,
        'transform-origin': 'top left',
      });
      return `<div data-inline-line="${lineIndex}"${lineStyle ? ` style="${lineStyle}"` : ''}>${(lines.get(lineIndex) ?? []).join('') || '<br>'}<span data-inline-line-baseline="1" style="display:inline-block;width:0;height:1px;padding:0;margin:0;overflow:hidden;vertical-align:baseline"></span></div>`;
    })
    .join('');
};

const parseEditablePlainText = (root: HTMLDivElement): string => {
  const clone = root.cloneNode(true) as HTMLDivElement;
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));

  const lineNodes = Array.from(clone.children);
  if (lineNodes.length > 0) {
    return lineNodes
      .map((lineNode) => lineNode.textContent?.replace(/\u00A0/g, ' ') ?? '')
      .join('\n');
  }

  return (clone.textContent ?? '').replace(/\u00A0/g, ' ');
};

const placeCaretAtEnd = (element: HTMLDivElement) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const applyInlineLineBaselineMarkerStyle = (marker: HTMLSpanElement) => {
  marker.dataset.inlineLineBaseline = '1';
  marker.style.display = 'inline-block';
  marker.style.width = '0';
  marker.style.height = '1px';
  marker.style.padding = '0';
  marker.style.margin = '0';
  marker.style.overflow = 'hidden';
  marker.style.verticalAlign = 'baseline';
  marker.contentEditable = 'false';
  marker.setAttribute('aria-hidden', 'true');
};

const ensureInlineLineBaselineMarker = (lineNode: HTMLDivElement): HTMLSpanElement => {
  const existing = lineNode.querySelector('[data-inline-line-baseline="1"]');
  if (existing instanceof HTMLSpanElement) {
    applyInlineLineBaselineMarkerStyle(existing);
    return existing;
  }

  const marker = document.createElement('span');
  applyInlineLineBaselineMarkerStyle(marker);
  lineNode.appendChild(marker);
  return marker;
};

const getEditableLineNodes = (editor: HTMLDivElement): HTMLDivElement[] => {
  const directDivChildren = Array.from(editor.children).filter(
    (node): node is HTMLDivElement => node instanceof HTMLDivElement
  );
  if (directDivChildren.length > 0) {
    return directDivChildren;
  }

  const fallbackLine = document.createElement('div');
  while (editor.firstChild) {
    fallbackLine.appendChild(editor.firstChild);
  }
  if (fallbackLine.childNodes.length === 0) {
    fallbackLine.appendChild(document.createElement('br'));
  }
  editor.appendChild(fallbackLine);
  return [fallbackLine];
};

const applyEditorVisualOffset = (
  editor: HTMLDivElement,
  nextOffset: { x: number; y: number },
  previousOffsetRef: React.MutableRefObject<{ x: number; y: number }>
) => {
  const previousOffset = previousOffsetRef.current;
  if (previousOffset.x === nextOffset.x && previousOffset.y === nextOffset.y) {
    return;
  }

  previousOffsetRef.current = nextOffset;
  editor.style.transform = `translate(${nextOffset.x}px, ${nextOffset.y}px)`;
};

const syncEditableLineLayout = (
  editor: HTMLDivElement,
  data: NativeTextElement['data'],
  desiredLineOffsets: Map<number, {
    leftOffset: number;
    naturalTopOffset: number;
    desiredTopOffset: number;
    desiredBaselineY: number;
  }>,
  paddingX: number,
  paddingY: number,
) => {
  const lineNodes = getEditableLineNodes(editor);

  lineNodes.forEach((lineNode, lineIndex) => {
    lineNode.dataset.inlineLine = String(lineIndex);
    lineNode.style.display = 'block';
    lineNode.style.width = 'max-content';
    lineNode.style.transformOrigin = 'top left';

    if (lineNode.childNodes.length === 0) {
      lineNode.appendChild(document.createElement('br'));
    }

    ensureInlineLineBaselineMarker(lineNode);

    const desiredOffset = desiredLineOffsets.get(lineIndex);
    const leftOffset = desiredOffset?.leftOffset ?? paddingX;
    const naturalTopOffset = desiredOffset?.naturalTopOffset ?? (paddingY + lineIndex * data.fontSize * INLINE_EDITOR_LINE_HEIGHT);
    const desiredTopOffset = desiredOffset?.desiredTopOffset ?? (paddingY + lineIndex * data.fontSize * (data.lineHeight ?? 1.2));
    const relativeTopOffset = desiredTopOffset - naturalTopOffset;
    const relativeLeftOffset = leftOffset - paddingX;
    lineNode.style.transform = `translate(${relativeLeftOffset}px, ${relativeTopOffset}px)`;
  });
};

const buildInlineEditedNativeTextData = (
  data: NativeTextElement['data'],
  plainText: string,
  originalData?: NativeTextElement['data'],
): NativeTextElement['data'] => {
  if (originalData && plainText === (originalData.text ?? '')) {
    return originalData;
  }

  const spans = buildSpansPreservingGlyphTransforms(
    plainText,
    data.text ?? '',
    data.spans,
    {
      fontWeight: data.fontWeight ?? undefined,
      fontStyle: data.fontStyle ?? undefined,
      fontSize: data.fontSize,
      textDecoration: data.textDecoration ?? undefined,
      fillColor: data.fillColor ?? undefined,
    }
  );

  return {
    ...data,
    text: plainText,
    richText: buildRichTextFromPlainTextAndSpans(plainText, spans),
    spans,
  };
};

const buildInlineEditorRenderSignature = (data: NativeTextElement['data']): string => JSON.stringify({
  text: data.text ?? '',
  spans: data.spans ?? [],
  fontSize: data.fontSize,
  fontFamily: data.fontFamily,
  fontWeight: data.fontWeight ?? 'normal',
  fontStyle: data.fontStyle ?? 'normal',
  textDecoration: data.textDecoration ?? 'none',
  fillColor: data.fillColor ?? '',
  letterSpacing: data.letterSpacing ?? null,
  textTransform: data.textTransform ?? 'none',
  writingMode: data.writingMode ?? 'horizontal-tb',
  direction: data.direction ?? null,
});

const hasInlineEditorVisualTransform = (data: NativeTextElement['data']): boolean =>
  Boolean(
    data.transformMatrix ||
    data.transform
  );

export const NativeTextInlineEditorLayer: React.FC = () => {
  const editingElementId = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).inlineTextEdit?.editingElementId ?? null
  );
  const elements = useCanvasStore((state) => state.elements);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const stopInlineTextEdit = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).stopInlineTextEdit
  );
  const setInlineTextEditPreviewBounds = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).setInlineTextEditPreviewBounds
  );
  const setInlineTextEditReady = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).setInlineTextEditReady
  );
  const setInlineTextEditSelection = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).setInlineTextEditSelection
  );
  const isInlineEditorReady = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).inlineTextEdit?.isEditorReady ?? false
  );
  const viewportZoom = useCanvasStore((state) => state.viewport.zoom);
  const editorRef = useRef<HTMLDivElement>(null);
  const previousEditingIdRef = useRef<string | null>(null);
  const originalElementRef = useRef<NativeTextElement | null>(null);
  const liveElementDataRef = useRef<NativeTextElement['data'] | null>(null);
  const skipBlurCommitRef = useRef(false);
  const pendingVisualSyncFrameRef = useRef<number | null>(null);
  const editorVisualOffsetRef = useRef({ x: 0, y: 0 });
  const inlineRenderSignatureRef = useRef<string | null>(null);
  const [editorHtml, setEditorHtml] = useState('');

  const element = useMemo(() => {
    if (!editingElementId) return null;
    const candidate = elements.find((entry) => entry.id === editingElementId);
    return candidate?.type === 'nativeText' ? candidate as NativeTextElement : null;
  }, [editingElementId, elements]);
  const elementMap = useMemo(() => new Map(elements.map((entry) => [entry.id, entry])), [elements]);

  const isInlineNativeTextEditing = Boolean(element) && !isTouchDevice();

  const syncEditorVisualOffset = useCallback((
    data: NativeTextElement['data'],
  ) => {
    const editor = editorRef.current;
    if (!editor) return;

    const editorBox = getNativeTextEditorBox(data);
    const measuredBounds = editorBox.bounds ?? measureNativeTextBounds(data);
    const { lineBoxes, glyphMetrics } = measureTextLayout(data);
    const desiredLineOffsets = computeDesiredLineOffsets(
      data,
      measuredBounds,
      lineBoxes,
      glyphMetrics,
      editorBox.paddingX,
      editorBox.paddingY,
    );
    syncEditableLineLayout(
      editor,
      data,
      desiredLineOffsets,
      editorBox.paddingX,
      editorBox.paddingY,
    );
    if (hasInlineEditorVisualTransform(data)) {
      // `getBoundingClientRect()` is screen-space after the element matrix is applied.
      // The scalar correction below only works for untransformed text; with affine
      // transforms it overcompensates and shifts the editor away from the glyphs.
      applyEditorVisualOffset(editor, { x: 0, y: 0 }, editorVisualOffsetRef);
      return;
    }
    const liveOffsets = measureLiveEditorOffsets(editor, viewportZoom);
    const firstLine = Array.from(desiredLineOffsets.keys()).sort((left, right) => left - right)[0];

    if (firstLine === undefined) {
      applyEditorVisualOffset(editor, { x: 0, y: 0 }, editorVisualOffsetRef);
      return;
    }

    const desired = desiredLineOffsets.get(firstLine);
    const actual = liveOffsets.get(firstLine);
    if (!desired || !actual) {
      applyEditorVisualOffset(editor, { x: 0, y: 0 }, editorVisualOffsetRef);
      return;
    }

    applyEditorVisualOffset(editor, {
      x: desired.leftOffset - actual.left,
      y: desired.desiredBaselineY !== undefined
        ? desired.desiredBaselineY - actual.baseline
        : desired.desiredTopOffset - actual.top,
    }, editorVisualOffsetRef);
  }, [viewportZoom]);

  const scheduleVisualSync = useCallback((data: NativeTextElement['data']) => {
    if (pendingVisualSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingVisualSyncFrameRef.current);
    }

    pendingVisualSyncFrameRef.current = window.requestAnimationFrame(() => {
      pendingVisualSyncFrameRef.current = null;
      syncEditorVisualOffset(data);
    });
  }, [syncEditorVisualOffset]);

  const measureDraftBounds = useCallback((draftData: NativeTextElement['data']) => {
    const originalElement = originalElementRef.current;
    if (!originalElement) {
      return null;
    }

    return elementContributionRegistry.getBounds(
      {
        ...originalElement,
        data: draftData,
      },
      {
        viewport: {
          zoom: viewportZoom,
          panX: 0,
          panY: 0,
        },
        elementMap,
      }
    );
  }, [elementMap, viewportZoom]);

  const syncDraftFeedback = useCallback((draftData: NativeTextElement['data']) => {
    liveElementDataRef.current = draftData;
    setInlineTextEditPreviewBounds?.(measureDraftBounds(draftData));
    scheduleVisualSync(draftData);
  }, [measureDraftBounds, scheduleVisualSync, setInlineTextEditPreviewBounds]);

  const syncLiveElementText = useCallback((editor: HTMLDivElement) => {
    const originalElement = originalElementRef.current;
    if (!originalElement) {
      return;
    }

    const plainText = parseEditablePlainText(editor);
    const baseData = liveElementDataRef.current ?? originalElement.data;
    if (plainText === (baseData.text ?? '') && plainText === (baseData.richText ?? '')) {
      scheduleVisualSync(baseData);
      return;
    }

    const nextData = buildInlineEditedNativeTextData(baseData, plainText, originalElement.data);
    syncDraftFeedback(nextData);
  }, [scheduleVisualSync, syncDraftFeedback]);

  const syncInlineSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !setInlineTextEditSelection) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    setInlineTextEditSelection(
      getContentEditableSelectionOffsets(editor, range, INLINE_SELECTION_TRAVERSAL_OPTIONS)
    );
  }, [setInlineTextEditSelection]);

  const getInlineSelectionSnapshot = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    return getContentEditableSelectionOffsets(editor, range, INLINE_SELECTION_TRAVERSAL_OPTIONS);
  }, []);

  useEffect(() => {
    if (!isInlineNativeTextEditing || !element) return;
    if (previousEditingIdRef.current === element.id) return;

    previousEditingIdRef.current = element.id;
    originalElementRef.current = element;
    skipBlurCommitRef.current = false;
    editorVisualOffsetRef.current = { x: 0, y: 0 };
    setInlineTextEditReady?.(false);
    const editorBox = getNativeTextEditorBox(element.data);
    const measuredBounds = editorBox.bounds ?? measureNativeTextBounds(element.data);
    const { lineBoxes, glyphMetrics } = measureTextLayout(element.data);
    const initialHtml = buildInitialEditorHtml(
      element.data,
      measuredBounds,
      lineBoxes,
      glyphMetrics,
      editorBox.paddingX,
      editorBox.paddingY,
    );
    inlineRenderSignatureRef.current = buildInlineEditorRenderSignature(element.data);
    setEditorHtml(initialHtml);

    let innerFrame = 0;
    let revealFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        const editor = editorRef.current;
        if (!editor) return;
        syncDraftFeedback(element.data);
        editor.focus();
        placeCaretAtEnd(editor);
        syncInlineSelection();
        revealFrame = window.requestAnimationFrame(() => {
          setInlineTextEditReady?.(true);
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
      if (revealFrame) {
        window.cancelAnimationFrame(revealFrame);
      }
    };
  }, [element, isInlineNativeTextEditing, setInlineTextEditReady, syncDraftFeedback, syncInlineSelection]);

  useEffect(() => {
    if (!isInlineNativeTextEditing) {
      setInlineTextEditSelection?.(null);
      return;
    }

    const handleSelectionChange = () => {
      syncInlineSelection();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isInlineNativeTextEditing, setInlineTextEditSelection, syncInlineSelection]);

  useEffect(() => {
    liveElementDataRef.current = element?.data ?? null;
    if (element && previousEditingIdRef.current === element.id) {
      originalElementRef.current = element;
    }
  }, [element]);

  useEffect(() => {
    if (!isInlineNativeTextEditing || !element || !isInlineEditorReady) {
      return;
    }

    const nextSignature = buildInlineEditorRenderSignature(element.data);
    if (inlineRenderSignatureRef.current === nextSignature) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      inlineRenderSignatureRef.current = nextSignature;
      return;
    }

    const currentPlainText = parseEditablePlainText(editor);
    if (currentPlainText !== (element.data.text ?? '')) {
      inlineRenderSignatureRef.current = nextSignature;
      return;
    }

    const selectionSnapshot = getInlineSelectionSnapshot();

    const editorBox = getNativeTextEditorBox(element.data);
    const measuredBounds = editorBox.bounds ?? measureNativeTextBounds(element.data);
    const { lineBoxes, glyphMetrics } = measureTextLayout(element.data);
    const nextHtml = buildInitialEditorHtml(
      element.data,
      measuredBounds,
      lineBoxes,
      glyphMetrics,
      editorBox.paddingX,
      editorBox.paddingY,
    );
    inlineRenderSignatureRef.current = nextSignature;

    if (editor.innerHTML === nextHtml) {
      scheduleVisualSync(element.data);
      return;
    }

    setEditorHtml(nextHtml);

    const restoreFrame = window.requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) {
        return;
      }

      if (selectionSnapshot) {
        const range = createContentEditableRangeFromOffsets(
          currentEditor,
          selectionSnapshot,
          INLINE_SELECTION_TRAVERSAL_OPTIONS,
        );
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      syncInlineSelection();
      scheduleVisualSync(element.data);
    });

    return () => {
      window.cancelAnimationFrame(restoreFrame);
    };
  }, [element, getInlineSelectionSnapshot, isInlineEditorReady, isInlineNativeTextEditing, scheduleVisualSync, syncInlineSelection]);

  useEffect(() => {
    if (!isInlineNativeTextEditing) return;
    const currentData = liveElementDataRef.current ?? element?.data;
    if (!currentData) return;
    scheduleVisualSync(currentData);
  }, [element?.data, element?.id, isInlineNativeTextEditing, scheduleVisualSync]);

  useEffect(() => {
    if (editingElementId) return;
    previousEditingIdRef.current = null;
    originalElementRef.current = null;
    liveElementDataRef.current = null;
    skipBlurCommitRef.current = false;
    editorVisualOffsetRef.current = { x: 0, y: 0 };
    setInlineTextEditReady?.(false);
    if (pendingVisualSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingVisualSyncFrameRef.current);
      pendingVisualSyncFrameRef.current = null;
    }
    inlineRenderSignatureRef.current = null;
    setInlineTextEditSelection?.(null);
    setEditorHtml('');
  }, [editingElementId, setInlineTextEditReady, setInlineTextEditSelection]);

  const commitEdit = useCallback(() => {
    const originalElement = originalElementRef.current;
    const editor = editorRef.current;
    if (!originalElement || !editor || !updateElement) {
      stopInlineTextEdit?.();
      return;
    }

    const plainText = parseEditablePlainText(editor);
    const nextData = buildInlineEditedNativeTextData(
      liveElementDataRef.current ?? originalElement.data,
      plainText,
      originalElement.data,
    );
    liveElementDataRef.current = nextData;
    updateElement(originalElement.id, {
      data: nextData,
    });
    stopInlineTextEdit?.();
  }, [stopInlineTextEdit, updateElement]);

  const cancelEdit = useCallback(() => {
    skipBlurCommitRef.current = true;
    stopInlineTextEdit?.();
  }, [stopInlineTextEdit]);

  if (!isInlineNativeTextEditing || !element) {
    return null;
  }

  const box = getNativeTextEditorBox(element.data);
  const transform = computeNativeTextTransformAttr(element.data);

  return (
    <g transform={transform} data-element-id={`${element.id}-inline-editor-layer`}>
      <foreignObject
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        clipPath={element.data.clipPathId ? `url(#${element.data.clipPathId})` : undefined}
        mask={element.data.maskId ? `url(#${element.data.maskId})` : undefined}
        opacity={element.data.opacity}
        style={{ overflow: 'visible', pointerEvents: 'auto' }}
      >
        <div
          {...({ xmlns: 'http://www.w3.org/1999/xhtml' } as Record<string, string>)}
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: isInlineEditorReady ? 'auto' : 'none',
            opacity: isInlineEditorReady ? 1 : 0,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Inline text editor"
            spellCheck={false}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            onInput={(event) => {
              event.stopPropagation();
              syncLiveElementText(event.currentTarget);
              syncInlineSelection();
            }}
            onBlur={() => {
              if (skipBlurCommitRef.current) {
                skipBlurCommitRef.current = false;
                return;
              }

              commitEdit();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelEdit();
              }
            }}
            onKeyUp={() => {
              syncInlineSelection();
            }}
            onMouseUp={() => {
              syncInlineSelection();
            }}
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              overflow: 'visible',
              border: 'none',
              borderRadius: 0,
              outline: 'none',
              padding: `${box.paddingY}px ${box.paddingX}px`,
              margin: 0,
              background: 'transparent',
              color: element.data.fillColor ?? 'var(--chakra-colors-chakra-body-text, #1A202C)',
              WebkitTextStrokeWidth: (element.data.strokeWidth ?? 0) > 0 ? `${element.data.strokeWidth ?? 0}px` : undefined,
              WebkitTextStrokeColor: resolveCssColorWithOpacity(element.data.strokeColor, element.data.strokeOpacity),
              caretColor: 'var(--chakra-colors-blue-500, #3182CE)',
              boxShadow: 'none',
              fontFamily: element.data.fontFamily,
              fontSize: `${element.data.fontSize}px`,
              fontWeight: element.data.fontWeight ?? 'normal',
              fontStyle: element.data.fontStyle ?? 'normal',
              lineHeight: String(INLINE_EDITOR_LINE_HEIGHT),
              letterSpacing: element.data.letterSpacing !== undefined ? `${element.data.letterSpacing}px` : undefined,
              textAlign: 'left',
              textDecoration: element.data.textDecoration !== 'none' ? element.data.textDecoration : undefined,
              textTransform: element.data.textTransform !== 'none' ? element.data.textTransform : undefined,
              writingMode: isVerticalWritingMode(element.data.writingMode)
                ? element.data.writingMode as React.CSSProperties['writingMode']
                : undefined,
              direction: element.data.direction,
              whiteSpace: 'pre',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              position: 'relative',
              transform: 'translate(0px, 0px)',
            }}
            dangerouslySetInnerHTML={{ __html: editorHtml }}
          />
        </div>
      </foreignObject>
    </g>
  );
};

NativeTextInlineEditorLayer.displayName = 'NativeTextInlineEditorLayer';
