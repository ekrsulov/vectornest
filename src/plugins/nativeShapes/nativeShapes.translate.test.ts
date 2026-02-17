import { describe, it, expect, beforeAll } from 'vitest';
import { elementContributionRegistry, type ElementContribution } from '../../utils/elementContributionRegistry';
import { nativeShapesPlugin } from './index';
import type { NativeShapeElement } from './types';

beforeAll(() => {
  const contribution = (nativeShapesPlugin as unknown as { elementContributions?: ElementContribution[] }).elementContributions?.[0];
  if (contribution) {
    elementContributionRegistry.register(nativeShapesPlugin.id, contribution);
  }
});

describe('nativeShapes translation', () => {
  it('moves polygon points when no transform matrix is present', () => {
    const el: NativeShapeElement = {
      id: 'poly1',
      zIndex: 0,
      type: 'nativeShape',
      parentId: null,
      data: {
        kind: 'polygon',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        points: [
          { x: 20, y: 20 },
          { x: 60, y: 20 },
          { x: 60, y: 60 },
        ],
      },
    };

    const translated = elementContributionRegistry.translateElement(el, 5, 10, 3) as NativeShapeElement | null;
    expect(translated).not.toBeNull();
    expect(translated!.data.x).toBeCloseTo(15);
    expect(translated!.data.y).toBeCloseTo(20);
    expect(translated!.data.points).toEqual([
      { x: 25, y: 30 },
      { x: 65, y: 30 },
      { x: 65, y: 70 },
    ]);
  });

  it('applies translation to transformMatrix when transform exists', () => {
    const el: NativeShapeElement = {
      id: 'poly2',
      zIndex: 0,
      type: 'nativeShape',
      parentId: null,
      data: {
        kind: 'polygon',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        points: [
          { x: 20, y: 20 },
          { x: 60, y: 20 },
          { x: 60, y: 60 },
        ],
        transformMatrix: [1, 0, 0, 1, 0, 0],
      },
    };

    const translated = elementContributionRegistry.translateElement(el, 5, 10, 3) as NativeShapeElement | null;
    expect(translated).not.toBeNull();
    expect(translated!.data.transformMatrix).toEqual([1, 0, 0, 1, 5, 10]);
    // original points should remain unchanged (because transform applied instead)
    expect(translated!.data.points).toEqual(el.data.points);
  });
});
