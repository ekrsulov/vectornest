import { describe, expect, it } from 'vitest';
import { buildUseReferenceCache } from './importer';

describe('buildUseReferenceCache', () => {
  it('caches geometry for polygon references so imported use elements remain renderable', () => {
    const polygonElement = {
      tagName: 'polygon',
      getAttribute: (name: string) => {
        switch (name) {
          case 'points':
            return '0,-50 43.3,25 -43.3,25';
          case 'fill':
            return null;
          case 'stroke':
            return null;
          case 'stroke-width':
            return null;
          case 'stroke-opacity':
            return null;
          case 'fill-opacity':
            return null;
          default:
            return null;
        }
      },
    } as unknown as Element;

    const cache = buildUseReferenceCache(
      polygonElement,
      'bauhaus-triangle',
      {
        fillColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 6,
      },
      0,
      0
    );

    expect(cache.cachedPathData?.subPaths.length).toBe(1);
    expect(cache.cachedPathData).toMatchObject({
      fillColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 6,
    });
    expect(cache.cachedBounds).toEqual({
      minX: -46.3,
      minY: -53,
      width: 92.6,
      height: 81,
    });
    expect(cache.width).toBe(92.6);
    expect(cache.height).toBe(81);
  });
});