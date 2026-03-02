import { describe, expect, it } from 'vitest';
import type { CanvasElement } from '../../types';
import { extractPaints, extractPaintsFromPaintData, resolveElementPaintData } from './paintExtraction';

describe('paintExtraction', () => {
  it('splits stroke paints by stroke opacity', () => {
    const paints = extractPaintsFromPaintData(
      [
        {
          id: 'stroke-only',
          type: 'path',
          strokeColor: '#ff0000',
          strokeOpacity: 0.35,
        },
      ],
      true
    );

    expect(paints).toHaveLength(1);
    expect(paints[0]).toMatchObject({
      value: '#FF0000',
      paintKey: '#ff0000@0.35',
      opacity: 0.35,
      fillCount: 0,
      strokeCount: 1,
    });
  });

  it('resolves nested stroke paint data before grouping by opacity', () => {
    const element = {
      id: 'symbol-1',
      type: 'symbolInstance',
      zIndex: 1,
      parentId: null,
      data: {
        pathData: {
          fillColor: '#00ff00',
          fillOpacity: 1,
          strokeColor: '#112233',
          strokeOpacity: 0.42,
        },
      },
    } as CanvasElement;

    expect(resolveElementPaintData(element)).toMatchObject({
      fillColor: '#00ff00',
      fillOpacity: 1,
      strokeColor: '#112233',
      strokeOpacity: 0.42,
    });

    const paints = extractPaints([element], true);
    const strokePaint = paints.find((paint) => paint.normalizedValue === '#112233');

    expect(strokePaint).toBeDefined();
    expect(strokePaint).toMatchObject({
      paintKey: '#112233@0.42',
      opacity: 0.42,
      strokeCount: 1,
    });
  });

  it('accepts numeric opacity values stored as strings', () => {
    const element = {
      id: 'use-1',
      type: 'use',
      zIndex: 1,
      parentId: null,
      data: {
        styleOverrides: {
          strokeColor: '#abcdef',
          strokeOpacity: '0.6',
        },
      },
    } as unknown as CanvasElement;

    const paints = extractPaints([element], true);

    expect(paints[0]).toMatchObject({
      value: '#ABCDEF',
      paintKey: '#abcdef@0.60',
      opacity: 0.6,
      strokeCount: 1,
    });
  });
});
