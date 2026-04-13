import { describe, expect, it } from 'vitest';
import {
  buildRichTextFromPlainTextAndSpans,
  buildSpansPreservingGlyphTransforms,
} from './inlineTextSpanUtils';

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
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: undefined,
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
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: undefined,
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
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: undefined,
        dx: undefined,
        dy: undefined,
        rotate: undefined,
      },
      {
        text: 'Zcd',
        line: 1,
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: undefined,
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
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: undefined,
        dx: undefined,
        dy: undefined,
        rotate: '18 18 18 18',
      },
    ]);
  });

  it('preserves span fill colors when text content is unchanged', () => {
    const spans = buildSpansPreservingGlyphTransforms(
      'VectorNest',
      'VectorNest',
      [
        {
          text: 'Vector',
          line: 0,
          fillColor: '#2D3436',
        },
        {
          text: 'Nest',
          line: 0,
          fillColor: '#6C5CE7',
        },
      ],
      {
        fontWeight: 'normal',
        fontStyle: 'normal',
        fillColor: '#000000',
      }
    );

    expect(spans).toEqual([
      {
        text: 'Vector',
        line: 0,
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: '#2D3436',
        dx: undefined,
        dy: undefined,
        rotate: undefined,
      },
      {
        text: 'Nest',
        line: 0,
        fontWeight: undefined,
        fontStyle: undefined,
        fontSize: undefined,
        textDecoration: undefined,
        fillColor: '#6C5CE7',
        dx: undefined,
        dy: undefined,
        rotate: undefined,
      },
    ]);
  });

  it('rebuilds rich text markup from preserved spans', () => {
    const html = buildRichTextFromPlainTextAndSpans('Vector\nNest', [
      {
        text: 'Vector',
        line: 0,
        fillColor: '#2D3436',
      },
      {
        text: 'Nest',
        line: 1,
        fillColor: '#6C5CE7',
      },
    ]);

    expect(html).toBe(
      '<span style="color:#2D3436">Vector</span><br><span style="color:#6C5CE7">Nest</span>'
    );
  });
});