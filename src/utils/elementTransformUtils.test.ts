import { describe, expect, it } from 'vitest';
import type { CanvasElement, GroupElement, PathElement } from '../types';
import {
  getParentCumulativeTransformMatrix,
  transformDeltaToElementLocal,
  transformPointToElementLocal,
} from './elementTransformUtils';

const createScaledGroup = (): GroupElement => ({
  id: 'group-1',
  type: 'group',
  zIndex: 0,
  parentId: null,
  data: {
    childIds: ['path-1'],
    name: 'Scaled group',
    isLocked: false,
    isHidden: false,
    isExpanded: true,
    transform: {
      translateX: 130.5859,
      translateY: 252.0234,
      rotation: 0,
      scaleX: 19.846029166666664,
      scaleY: 19.846029166666664,
    },
  },
});

const createChildPath = (): PathElement => ({
  id: 'path-1',
  type: 'path',
  zIndex: 1,
  parentId: 'group-1',
  data: {
    subPaths: [],
    strokeWidth: 2,
    strokeColor: '#000000',
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
  },
});

describe('elementTransformUtils local transform helpers', () => {
  it('returns the parent matrix for children inside scaled groups', () => {
    const elements: CanvasElement[] = [createScaledGroup(), createChildPath()];
    const matrix = getParentCumulativeTransformMatrix(elements[1], elements);

    expect(matrix[0]).toBeCloseTo(19.846029166666664);
    expect(matrix[3]).toBeCloseTo(19.846029166666664);
    expect(matrix[4]).toBeCloseTo(130.5859);
    expect(matrix[5]).toBeCloseTo(252.0234);
  });

  it('converts canvas delta into local path delta', () => {
    const elements: CanvasElement[] = [createScaledGroup(), createChildPath()];
    const path = elements[1];

    const localDelta = transformDeltaToElementLocal(
      { x: 19.846029166666664, y: 39.69205833333333 },
      path,
      elements
    );

    expect(localDelta.x).toBeCloseTo(1);
    expect(localDelta.y).toBeCloseTo(2);
  });

  it('converts canvas points into local path coordinates', () => {
    const elements: CanvasElement[] = [createScaledGroup(), createChildPath()];
    const path = elements[1];

    const localPoint = transformPointToElementLocal(
      { x: 130.5859 + 19.846029166666664 * 5, y: 252.0234 + 19.846029166666664 * 3 },
      path,
      elements
    );

    expect(localPoint.x).toBeCloseTo(5);
    expect(localPoint.y).toBeCloseTo(3);
  });
});
