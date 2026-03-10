import { describe, expect, it } from 'vitest';
import { buildSpansPreservingGlyphTransforms } from './inlineTextSpanUtils';

describe('buildSpansPreservingGlyphTransforms', () => {
  it('keeps glyph offsets and rotation when text is inserted before a modified glyph', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'zabc',
      'abc',
      [
        {
          text: 'abc',
          line: 0,
          dx: '0 10 0',
          dy: '0 2 0',
          rotate: '0 15 0',
        },
      ],
      { fontWeight: 'normal', fontStyle: 'normal' }
    );

    expect(spans).toEqual([
      {
        text: 'zabc',
        line: 0,
        fontWeight: 'normal',
        fontStyle: 'normal',
        dx: '0 0 10',
        dy: '0 0 2',
        rotate: '0 0 15',
      },
    ]);
  });

  it('moves preserved glyph transforms with surviving characters after deletion', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'bc',
      'abc',
      [
        {
          text: 'abc',
          line: 0,
          dx: '0 10 0',
          dy: '0 2 0',
          rotate: '0 15 0',
        },
      ],
      { fontWeight: 'normal', fontStyle: 'normal' }
    );

    expect(spans).toEqual([
      {
        text: 'bc',
        line: 0,
        fontWeight: 'normal',
        fontStyle: 'normal',
        dx: '10',
        dy: '2',
        rotate: '15',
      },
    ]);
  });

  it('preserves transforms across line breaks', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'ab\nZcd',
      'ab\ncd',
      [
        {
          text: 'ab',
          line: 0,
        },
        {
          text: 'cd',
          line: 1,
          dx: '0 8',
          rotate: '0 12',
        },
      ],
      { fontWeight: 'normal', fontStyle: 'normal' }
    );

    expect(spans).toEqual([
      {
        text: 'ab',
        line: 0,
        fontWeight: 'normal',
        fontStyle: 'normal',
        dx: undefined,
        dy: undefined,
        rotate: undefined,
      },
      {
        text: 'Zcd',
        line: 1,
        fontWeight: 'normal',
        fontStyle: 'normal',
        dx: '0 0 8',
        dy: undefined,
        rotate: '0 0 12',
      },
    ]);
  });

  it('returns undefined for a single line without preserved transforms', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'plain text',
      'plain text',
      undefined,
      { fontWeight: 'normal', fontStyle: 'normal' }
    );

    expect(spans).toBeUndefined();
  });

  it('propagates a single rotate value to all surviving glyphs in the span', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'abcd',
      'abcd',
      [
        {
          text: 'abcd',
          line: 0,
          rotate: '18',
        },
      ],
      { fontWeight: 'normal', fontStyle: 'normal' }
    );

    expect(spans).toEqual([
      {
        text: 'abcd',
        line: 0,
        fontWeight: 'normal',
        fontStyle: 'normal',
        dx: undefined,
        dy: undefined,
        rotate: '18 18 18 18',
      },
    ]);
  });
});