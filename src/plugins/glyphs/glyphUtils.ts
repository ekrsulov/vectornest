import type { GlyphInfo } from './slice';
import type { NativeTextElement } from '../nativeText/types';
import type { PathData } from '../../types';

type EditableSpan = NonNullable<NativeTextElement['data']['spans']>[number];
export type EditableGlyphData = NativeTextElement['data'] | NonNullable<PathData['textPath']>;

/**
 * Parse a space-separated list of numbers from a string.
 * Returns an array of parsed values.
 */
export function parseNumberList(value: string | undefined): number[] {
  if (!value || !value.trim()) return [];
  return value.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
}

function getRotateValueForGlyph(values: number[], index: number): number {
  if (values.length === 0) return 0;
  return values[index] ?? values[values.length - 1] ?? 0;
}

function normalizeTextSpans(data: EditableGlyphData): EditableSpan[] {
  if (data.spans && data.spans.length > 0) {
    return data.spans;
  }

  return (data.text ?? '').split(/\r?\n/).map((lineText, lineIndex) => ({
    text: lineText,
    line: lineIndex,
    fontWeight: data.fontWeight ?? undefined,
    fontStyle: data.fontStyle ?? undefined,
    textDecoration: data.textDecoration ?? undefined,
    fontSize: data.fontSize,
    fillColor: data.fillColor ?? undefined,
  }));
}

/**
 * Measure individual glyph positions from the rendered SVG text element.
 * Uses SVGTextContentElement.getExtentOfChar() for precise per-glyph bounding boxes.
 */
export function measureGlyphs(
  elementId: string,
  data: EditableGlyphData,
): GlyphInfo[] {
  const svgCanvas = document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null;
  if (!svgCanvas) return [];

  // Find the rendered <text> element
  const textEl = svgCanvas.querySelector<SVGTextElement>(
    `text[data-element-id="${CSS.escape(elementId)}"]`
  );
  if (!textEl) return [];

  const spans = normalizeTextSpans(data);
  const glyphs: GlyphInfo[] = [];
  let globalCharIndex = 0;

  for (let si = 0; si < spans.length; si++) {
    const span = spans[si];
    const text = span.text;
    const dxValues = parseNumberList(span.dx);
    const dyValues = parseNumberList(span.dy);
    const rotateValues = parseNumberList(span.rotate);

    for (let ci = 0; ci < text.length; ci++) {
      let bbox: GlyphInfo['bbox'] = null;
      try {
        if (globalCharIndex < textEl.getNumberOfChars()) {
          const extent = textEl.getExtentOfChar(globalCharIndex);
          bbox = {
            x: extent.x,
            y: extent.y,
            width: extent.width,
            height: extent.height,
          };
        }
      } catch {
        // skip
      }

      glyphs.push({
        index: globalCharIndex,
        char: text[ci],
        spanIndex: si,
        indexInSpan: ci,
        dx: dxValues[ci] ?? 0,
        dy: dyValues[ci] ?? 0,
        rotate: getRotateValueForGlyph(rotateValues, ci),
        bbox,
      });
      globalCharIndex++;
    }
  }

  return glyphs;
}

/**
 * Update the dx/dy/rotate values for a specific glyph in the element's spans.
 * Returns a new spans array (or undefined if no spans).
 */
export function updateGlyphInSpans(
  data: EditableGlyphData,
  glyphIndex: number,
  updates: { dx?: number; dy?: number; rotate?: number },
): EditableSpan[] {
  const spans = normalizeTextSpans(data);

  let globalIdx = 0;
  const newSpans = spans.map((span) => {
    const text = span.text;
    const dxValues = parseNumberList(span.dx);
    const dyValues = parseNumberList(span.dy);
    const rotateValues = parseNumberList(span.rotate);

    let changed = false;
    for (let ci = 0; ci < text.length; ci++) {
      if (globalIdx === glyphIndex) {
        // Ensure arrays are long enough
        while (dxValues.length <= ci) dxValues.push(0);
        while (dyValues.length <= ci) dyValues.push(0);
        while (rotateValues.length <= ci) rotateValues.push(0);

        if (updates.dx !== undefined) {
          dxValues[ci] = updates.dx;
          changed = true;
        }
        if (updates.dy !== undefined) {
          dyValues[ci] = updates.dy;
          changed = true;
        }
        if (updates.rotate !== undefined) {
          rotateValues[ci] = updates.rotate;
          changed = true;
        }
      }
      globalIdx++;
    }

    if (!changed) return span;

    // Trim trailing zeros from arrays
    const trimTrailing = (arr: number[]) => {
      let last = arr.length - 1;
      while (last >= 0 && arr[last] === 0) last--;
      return arr.slice(0, last + 1);
    };

    const trimmedDx = trimTrailing(dxValues);
    const trimmedDy = trimTrailing(dyValues);
    const trimmedRotate = trimTrailing(rotateValues);

    return {
      ...span,
      dx: trimmedDx.length > 0 ? trimmedDx.join(' ') : undefined,
      dy: trimmedDy.length > 0 ? trimmedDy.join(' ') : undefined,
      rotate: trimmedRotate.length > 0 ? trimmedRotate.join(' ') : undefined,
    };
  });

  return newSpans;
}
