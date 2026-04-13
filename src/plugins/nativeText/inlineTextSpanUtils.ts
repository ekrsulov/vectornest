import type { PathData } from '../../types';
import type { NativeTextElement } from './types';

type EditableSpan = NonNullable<NativeTextElement['data']['spans']>[number];
type EditableTextPathSpan = NonNullable<NonNullable<PathData['textPath']>['spans']>[number];
type SupportedSpan = EditableSpan | EditableTextPathSpan;

interface SpanDefaults {
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  fontSize?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  fillColor?: string;
}

interface GlyphTransformValues {
  dx: number;
  dy: number;
  rotate: number;
}

interface GlyphStyleOverrides {
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  fontSize?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  fillColor?: string;
}

const EMPTY_GLYPH_STYLE_OVERRIDES: GlyphStyleOverrides = {};

const parseNumberList = (value?: string): number[] => {
  if (!value || !value.trim()) return [];
  return value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
};

const normalizeText = (text: string): string => text.replace(/\r\n/g, '\n');

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeComparableString = (value?: string): string => (value ?? '').trim().toLowerCase();

const getCanonicalFontWeight = (value?: string): string => {
  if (!value || !value.trim()) {
    return 'normal';
  }

  const normalized = normalizeComparableString(value);
  return normalized === '400' ? 'normal' : normalized;
};

const getCanonicalFontStyle = (value?: string): string => {
  if (!value || !value.trim()) {
    return 'normal';
  }

  return normalizeComparableString(value);
};

const getCanonicalTextDecoration = (value?: string): string => {
  if (!value || !value.trim()) {
    return 'none';
  }

  return normalizeComparableString(value);
};

const getCanonicalColor = (value?: string): string => {
  if (!value || !value.trim()) {
    return '';
  }

  return normalizeComparableString(value);
};

const trimTrailingZeros = (values: number[]): number[] => {
  let lastIndex = values.length - 1;
  while (lastIndex >= 0 && values[lastIndex] === 0) {
    lastIndex -= 1;
  }
  return values.slice(0, lastIndex + 1);
};

const getRotateValueForGlyph = (values: number[], index: number): number => {
  if (values.length === 0) return 0;
  return values[index] ?? values[values.length - 1] ?? 0;
};

const buildStyleOverrides = (
  span: SupportedSpan,
  defaults: SpanDefaults
): GlyphStyleOverrides => {
  const fontWeight = span.fontWeight?.trim();
  const fontStyle = span.fontStyle?.trim() as GlyphStyleOverrides['fontStyle'] | undefined;
  const textDecoration = span.textDecoration?.trim() as GlyphStyleOverrides['textDecoration'] | undefined;
  const fillColor = span.fillColor?.trim();
  const fontSize = 'fontSize' in span ? span.fontSize : undefined;

  return {
    fontWeight:
      fontWeight !== undefined && getCanonicalFontWeight(fontWeight) !== getCanonicalFontWeight(defaults.fontWeight)
        ? fontWeight
        : undefined,
    fontStyle:
      fontStyle !== undefined && getCanonicalFontStyle(fontStyle) !== getCanonicalFontStyle(defaults.fontStyle)
        ? fontStyle
        : undefined,
    fontSize:
      fontSize !== undefined && fontSize !== defaults.fontSize
        ? fontSize
        : undefined,
    textDecoration:
      textDecoration !== undefined &&
      getCanonicalTextDecoration(textDecoration) !== getCanonicalTextDecoration(defaults.textDecoration)
        ? textDecoration
        : undefined,
    fillColor:
      fillColor !== undefined && getCanonicalColor(fillColor) !== getCanonicalColor(defaults.fillColor)
        ? fillColor
        : undefined,
  };
};

const styleOverridesEqual = (left: GlyphStyleOverrides, right: GlyphStyleOverrides): boolean => (
  left.fontWeight === right.fontWeight &&
  left.fontStyle === right.fontStyle &&
  left.fontSize === right.fontSize &&
  left.textDecoration === right.textDecoration &&
  left.fillColor === right.fillColor
);

const hasStyleOverrides = (style: GlyphStyleOverrides): boolean => (
  style.fontWeight !== undefined ||
  style.fontStyle !== undefined ||
  style.fontSize !== undefined ||
  style.textDecoration !== undefined ||
  style.fillColor !== undefined
);

const extractGlyphTransformsByTextIndex = (
  text: string,
  spans?: SupportedSpan[]
): Array<GlyphTransformValues | undefined> => {
  const normalizedText = normalizeText(text);
  const transformsByIndex = Array<GlyphTransformValues | undefined>(normalizedText.length).fill(undefined);

  if (!spans || spans.length === 0) {
    return transformsByIndex;
  }

  const glyphStream: GlyphTransformValues[] = [];

  spans.forEach((span) => {
    const dxValues = parseNumberList(span.dx);
    const dyValues = parseNumberList(span.dy);
    const rotateValues = parseNumberList(span.rotate);

    for (let charIndex = 0; charIndex < span.text.length; charIndex += 1) {
      glyphStream.push({
        dx: dxValues[charIndex] ?? 0,
        dy: dyValues[charIndex] ?? 0,
        rotate: getRotateValueForGlyph(rotateValues, charIndex),
      });
    }
  });

  let glyphIndex = 0;
  for (let textIndex = 0; textIndex < normalizedText.length; textIndex += 1) {
    if (normalizedText[textIndex] === '\n') {
      continue;
    }

    transformsByIndex[textIndex] = glyphStream[glyphIndex];
    glyphIndex += 1;
  }

  return transformsByIndex;
};

const extractGlyphStylesByTextIndex = (
  text: string,
  spans: SupportedSpan[] | undefined,
  defaults: SpanDefaults
): Array<GlyphStyleOverrides | undefined> => {
  const normalizedText = normalizeText(text);
  const stylesByIndex = Array<GlyphStyleOverrides | undefined>(normalizedText.length).fill(undefined);

  if (!spans || spans.length === 0) {
    return stylesByIndex;
  }

  const glyphStream: GlyphStyleOverrides[] = [];

  spans.forEach((span) => {
    const styleOverrides = buildStyleOverrides(span, defaults);
    for (let charIndex = 0; charIndex < span.text.length; charIndex += 1) {
      glyphStream.push(styleOverrides);
    }
  });

  let glyphIndex = 0;
  for (let textIndex = 0; textIndex < normalizedText.length; textIndex += 1) {
    if (normalizedText[textIndex] === '\n') {
      continue;
    }

    stylesByIndex[textIndex] = glyphStream[glyphIndex] ?? EMPTY_GLYPH_STYLE_OVERRIDES;
    glyphIndex += 1;
  }

  return stylesByIndex;
};

const findInheritedStyle = (
  stylesByIndex: Array<GlyphStyleOverrides | undefined>,
  lineStartIndex: number,
  lineEndIndex: number,
  glyphIndex: number
): GlyphStyleOverrides => {
  for (let index = glyphIndex - 1; index >= lineStartIndex; index -= 1) {
    const style = stylesByIndex[index];
    if (style) {
      return style;
    }
  }

  for (let index = glyphIndex + 1; index <= lineEndIndex; index += 1) {
    const style = stylesByIndex[index];
    if (style) {
      return style;
    }
  }

  return EMPTY_GLYPH_STYLE_OVERRIDES;
};

const trimTrailingZeroFloats = (values: number[]): string | undefined => {
  const trimmed = trimTrailingZeros(values);
  return trimmed.length > 0 ? trimmed.join(' ') : undefined;
};

const serializeRichTextSpan = (span: EditableSpan): string => {
  const styles = [
    span.fontWeight ? `font-weight:${span.fontWeight}` : null,
    span.fontStyle ? `font-style:${span.fontStyle}` : null,
    span.textDecoration ? `text-decoration:${span.textDecoration}` : null,
    span.fillColor ? `color:${span.fillColor}` : null,
  ].filter(Boolean).join(';');
  const text = escapeHtml(span.text);

  return styles ? `<span style="${styles}">${text}</span>` : text;
};

export const buildRichTextFromPlainTextAndSpans = (
  plainText: string,
  spans?: EditableSpan[]
): string => {
  if (!spans || spans.length === 0) {
    return escapeHtml(plainText).replace(/\n/g, '<br>');
  }

  let previousLine = 0;

  return spans.map((span, index) => {
    const prefix = index === 0 ? '' : '<br>'.repeat(Math.max(0, span.line - previousLine));
    previousLine = span.line;
    return `${prefix}${serializeRichTextSpan(span)}`;
  }).join('');
};

const mapMatchedIndices = (previousText: string, nextText: string): Map<number, number> => {
  const prev = normalizeText(previousText);
  const next = normalizeText(nextText);
  const matches = new Map<number, number>();

  let prefixLength = 0;
  while (
    prefixLength < prev.length &&
    prefixLength < next.length &&
    prev[prefixLength] === next[prefixLength]
  ) {
    matches.set(prefixLength, prefixLength);
    prefixLength += 1;
  }

  let prevSuffixIndex = prev.length - 1;
  let nextSuffixIndex = next.length - 1;
  while (
    prevSuffixIndex >= prefixLength &&
    nextSuffixIndex >= prefixLength &&
    prev[prevSuffixIndex] === next[nextSuffixIndex]
  ) {
    matches.set(nextSuffixIndex, prevSuffixIndex);
    prevSuffixIndex -= 1;
    nextSuffixIndex -= 1;
  }

  const prevMiddle = prev.slice(prefixLength, prevSuffixIndex + 1);
  const nextMiddle = next.slice(prefixLength, nextSuffixIndex + 1);

  if (prevMiddle.length === 0 || nextMiddle.length === 0) {
    return matches;
  }

  const dp = Array.from({ length: prevMiddle.length + 1 }, () =>
    Array<number>(nextMiddle.length + 1).fill(0)
  );

  for (let prevIndex = 1; prevIndex <= prevMiddle.length; prevIndex += 1) {
    for (let nextIndex = 1; nextIndex <= nextMiddle.length; nextIndex += 1) {
      if (prevMiddle[prevIndex - 1] === nextMiddle[nextIndex - 1]) {
        dp[prevIndex][nextIndex] = dp[prevIndex - 1][nextIndex - 1] + 1;
      } else {
        dp[prevIndex][nextIndex] = Math.max(dp[prevIndex - 1][nextIndex], dp[prevIndex][nextIndex - 1]);
      }
    }
  }

  const middleMatches: Array<[number, number]> = [];
  let prevIndex = prevMiddle.length;
  let nextIndex = nextMiddle.length;

  while (prevIndex > 0 && nextIndex > 0) {
    if (prevMiddle[prevIndex - 1] === nextMiddle[nextIndex - 1]) {
      middleMatches.push([
        prefixLength + nextIndex - 1,
        prefixLength + prevIndex - 1,
      ]);
      prevIndex -= 1;
      nextIndex -= 1;
      continue;
    }

    if (dp[prevIndex - 1][nextIndex] >= dp[prevIndex][nextIndex - 1]) {
      prevIndex -= 1;
    } else {
      nextIndex -= 1;
    }
  }

  middleMatches.reverse().forEach(([newIndex, oldIndex]) => {
    matches.set(newIndex, oldIndex);
  });

  return matches;
};

export const buildSpansPreservingGlyphTransforms = (
  nextText: string,
  previousText: string,
  previousSpans: SupportedSpan[] | undefined,
  defaults: SpanDefaults
): EditableSpan[] | undefined => {
  const normalizedNextText = normalizeText(nextText);
  const normalizedPreviousText = normalizeText(previousText);
  const previousTransforms = extractGlyphTransformsByTextIndex(normalizedPreviousText, previousSpans);
  const previousStyles = extractGlyphStylesByTextIndex(normalizedPreviousText, previousSpans, defaults);
  const matchedIndices = mapMatchedIndices(normalizedPreviousText, normalizedNextText);
  const preservedTransformsByNewIndex = Array<GlyphTransformValues | undefined>(normalizedNextText.length).fill(undefined);
  const preservedStylesByNewIndex = Array<GlyphStyleOverrides | undefined>(normalizedNextText.length).fill(undefined);

  matchedIndices.forEach((oldIndex, newIndex) => {
    preservedTransformsByNewIndex[newIndex] = previousTransforms[oldIndex];
    preservedStylesByNewIndex[newIndex] = previousStyles[oldIndex] ?? EMPTY_GLYPH_STYLE_OVERRIDES;
  });

  const lines = normalizedNextText.split('\n');
  const nextSpans: EditableSpan[] = [];
  let globalIndex = 0;

  lines.forEach((lineText, lineIndex) => {
    const lineStartIndex = globalIndex;
    const lineEndIndex = lineStartIndex + lineText.length - 1;

    let activeSpan:
      | (GlyphStyleOverrides & {
          text: string;
          line: number;
          dxValues: number[];
          dyValues: number[];
          rotateValues: number[];
        })
      | null = null;

    const flushActiveSpan = () => {
      if (!activeSpan) {
        return;
      }

      nextSpans.push({
        text: activeSpan.text,
        line: activeSpan.line,
        fontWeight: activeSpan.fontWeight,
        fontStyle: activeSpan.fontStyle,
        fontSize: activeSpan.fontSize,
        textDecoration: activeSpan.textDecoration,
        fillColor: activeSpan.fillColor,
        dx: trimTrailingZeroFloats(activeSpan.dxValues),
        dy: trimTrailingZeroFloats(activeSpan.dyValues),
        rotate: trimTrailingZeroFloats(activeSpan.rotateValues),
      });

      activeSpan = null;
    };

    for (let charIndex = 0; charIndex < lineText.length; charIndex += 1) {
      const textIndex = globalIndex;
      const transforms = preservedTransformsByNewIndex[textIndex];
      const styleOverrides = preservedStylesByNewIndex[textIndex]
        ?? findInheritedStyle(preservedStylesByNewIndex, lineStartIndex, lineEndIndex, textIndex);

      if (!activeSpan || !styleOverridesEqual(activeSpan, styleOverrides)) {
        flushActiveSpan();
        activeSpan = {
          ...styleOverrides,
          text: '',
          line: lineIndex,
          dxValues: [],
          dyValues: [],
          rotateValues: [],
        };
      }

      activeSpan.text += lineText[charIndex] ?? '';
      activeSpan.dxValues.push(transforms?.dx ?? 0);
      activeSpan.dyValues.push(transforms?.dy ?? 0);
      activeSpan.rotateValues.push(transforms?.rotate ?? 0);
      globalIndex += 1;
    }

    flushActiveSpan();

    if (lineIndex < lines.length - 1) {
      globalIndex += 1;
    }
  });

  const hasGlyphTransforms = nextSpans.some((span) => span.dx || span.dy || span.rotate);
  const hasInlineStyleOverrides = nextSpans.some((span) => hasStyleOverrides(span));

  if (nextSpans.length === 1 && !hasGlyphTransforms && !hasInlineStyleOverrides) {
    return undefined;
  }

  return nextSpans;
};