import type { PathData } from '../../types';
import type { NativeTextElement } from './types';

type EditableSpan = NonNullable<NativeTextElement['data']['spans']>[number];
type EditableTextPathSpan = NonNullable<NonNullable<PathData['textPath']>['spans']>[number];
type SupportedSpan = EditableSpan | EditableTextPathSpan;

interface SpanDefaults {
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
}

interface GlyphTransformValues {
  dx: number;
  dy: number;
  rotate: number;
}

const parseNumberList = (value?: string): number[] => {
  if (!value || !value.trim()) return [];
  return value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
};

const normalizeText = (text: string): string => text.replace(/\r\n/g, '\n');

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
  const matchedIndices = mapMatchedIndices(normalizedPreviousText, normalizedNextText);
  const preservedTransformsByNewIndex = Array<GlyphTransformValues | undefined>(normalizedNextText.length).fill(undefined);

  matchedIndices.forEach((oldIndex, newIndex) => {
    preservedTransformsByNewIndex[newIndex] = previousTransforms[oldIndex];
  });

  const lines = normalizedNextText.split('\n');
  const nextSpans: EditableSpan[] = [];
  let globalIndex = 0;

  lines.forEach((lineText, lineIndex) => {
    const dxValues = Array<number>(lineText.length).fill(0);
    const dyValues = Array<number>(lineText.length).fill(0);
    const rotateValues = Array<number>(lineText.length).fill(0);

    for (let charIndex = 0; charIndex < lineText.length; charIndex += 1) {
      const transforms = preservedTransformsByNewIndex[globalIndex];
      if (transforms) {
        dxValues[charIndex] = transforms.dx;
        dyValues[charIndex] = transforms.dy;
        rotateValues[charIndex] = transforms.rotate;
      }
      globalIndex += 1;
    }

    nextSpans.push({
      text: lineText,
      line: lineIndex,
      fontWeight: defaults.fontWeight,
      fontStyle: defaults.fontStyle,
      dx: (() => {
        const trimmed = trimTrailingZeros(dxValues);
        return trimmed.length > 0 ? trimmed.join(' ') : undefined;
      })(),
      dy: (() => {
        const trimmed = trimTrailingZeros(dyValues);
        return trimmed.length > 0 ? trimmed.join(' ') : undefined;
      })(),
      rotate: (() => {
        const trimmed = trimTrailingZeros(rotateValues);
        return trimmed.length > 0 ? trimmed.join(' ') : undefined;
      })(),
    });

    if (lineIndex < lines.length - 1) {
      globalIndex += 1;
    }
  });

  const hasGlyphTransforms = nextSpans.some((span) => span.dx || span.dy || span.rotate);

  if (nextSpans.length === 1 && !hasGlyphTransforms) {
    return undefined;
  }

  return nextSpans;
};