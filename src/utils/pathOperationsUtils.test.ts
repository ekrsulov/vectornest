import { describe, expect, it } from 'vitest';
import type { PathData, SubPath } from '../types';
import { joinSubPaths, performPathUnion, reverseSubPath } from './pathOperationsUtils';

const createPath = (subPaths: SubPath[], strokeColor: string): PathData => ({
  subPaths,
  strokeWidth: 2,
  strokeColor,
  strokeOpacity: 1,
  fillColor: 'none',
  fillOpacity: 1,
});

describe('pathOperationsUtils', () => {
  it('reverses closed subpaths while preserving closure', () => {
    const subPath: SubPath = [
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 10, y: 0 } },
      { type: 'L', position: { x: 10, y: 10 } },
      { type: 'Z' },
    ];

    const reversed = reverseSubPath(subPath);
    const first = reversed[0] as { type: 'M' | 'L'; position: { x: number; y: number } };
    expect(first.position).toEqual({ x: 10, y: 10 });
    expect(reversed[reversed.length - 1]).toEqual({ type: 'Z' });
  });

  it('joins adjacent subpaths by matching end/start points', () => {
    const subPathA: SubPath = [
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 5, y: 0 } },
    ];
    const subPathB: SubPath = [
      { type: 'M', position: { x: 5, y: 0 } },
      { type: 'L', position: { x: 9, y: 0 } },
    ];

    const joined = joinSubPaths([subPathA, subPathB]);
    expect(joined).toHaveLength(1);
    expect(joined[0]).toEqual([
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 5, y: 0 } },
      { type: 'L', position: { x: 9, y: 0 } },
    ]);
  });

  it('unions path arrays by concatenating subpaths and preserving first style', () => {
    const pathA = createPath([[{ type: 'M', position: { x: 0, y: 0 } }]], '#111111');
    const pathB = createPath([[{ type: 'M', position: { x: 10, y: 10 } }]], '#ff0000');

    const union = performPathUnion([pathA, pathB]);
    expect(union).not.toBeNull();
    expect(union?.subPaths).toHaveLength(2);
    expect(union?.strokeColor).toBe('#111111');
  });
});
