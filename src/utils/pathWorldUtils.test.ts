import { describe, expect, it } from 'vitest';
import type { ControlPoint, SubPath } from '../types';
import { getSubPathsBounds, getSubPathsTightBounds } from './pathWorldUtils';

const createControlPoint = (x: number, y: number): ControlPoint => ({
  x,
  y,
  commandIndex: 0,
  pointIndex: 0,
  anchor: { x: 0, y: 0 },
  isControl: true,
});

describe('pathWorldUtils', () => {
  it('keeps legacy bounds including cubic control points', () => {
    const subPaths: SubPath[] = [[
      { type: 'M', position: { x: 0, y: 0 } },
      {
        type: 'C',
        controlPoint1: createControlPoint(0, 10),
        controlPoint2: createControlPoint(10, 10),
        position: { x: 10, y: 0 },
      },
    ]];

    expect(getSubPathsBounds(subPaths)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
    });
  });

  it('computes tight curve bounds without counting control points', () => {
    const subPaths: SubPath[] = [[
      { type: 'M', position: { x: 0, y: 0 } },
      {
        type: 'C',
        controlPoint1: createControlPoint(0, 10),
        controlPoint2: createControlPoint(10, 10),
        position: { x: 10, y: 0 },
      },
    ]];

    const bounds = getSubPathsTightBounds(subPaths);

    expect(bounds?.minX).toBeCloseTo(0);
    expect(bounds?.minY).toBeCloseTo(0);
    expect(bounds?.maxX).toBeCloseTo(10);
    expect(bounds?.maxY).toBeCloseTo(7.5);
  });
});
