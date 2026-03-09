import { describe, expect, it } from 'vitest';
import {
  createRotateMatrix,
  getMatrixAxisScales,
  multiplyMatrices,
  type Matrix,
} from './matrixUtils';

describe('matrixUtils.getMatrixAxisScales', () => {
  it('returns unit scales for the identity matrix', () => {
    expect(getMatrixAxisScales([1, 0, 0, 1, 0, 0])).toEqual({ x: 1, y: 1 });
  });

  it('ignores translation and preserves uniform imported group scales', () => {
    expect(getMatrixAxisScales([0.09375, 0, 0, 0.09375, 159.2, 127.9])).toEqual({
      x: 0.09375,
      y: 0.09375,
    });
  });

  it('keeps per-axis magnitudes after rotation', () => {
    const rotatedScaled = multiplyMatrices(createRotateMatrix(90), [2, 0, 0, 3, 0, 0] satisfies Matrix);

    expect(getMatrixAxisScales(rotatedScaled).x).toBeCloseTo(2);
    expect(getMatrixAxisScales(rotatedScaled).y).toBeCloseTo(3);
  });

  it('returns positive magnitudes for reflected axes', () => {
    expect(getMatrixAxisScales([-2, 0, 0, -4, 10, 20])).toEqual({ x: 2, y: 4 });
  });
});
