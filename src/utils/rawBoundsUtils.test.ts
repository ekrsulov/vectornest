import { describe, expect, it } from 'vitest';
import type { Command, ControlPoint } from '../types';
import { calculateRawCommandsBounds, calculateRawSubPathsBounds } from './rawBoundsUtils';

const createControlPoint = (x: number, y: number): ControlPoint => ({
  x,
  y,
  commandIndex: 0,
  pointIndex: 0,
  anchor: { x: 0, y: 0 },
  isControl: true,
});

describe('rawBoundsUtils', () => {
  it('calculates command bounds including cubic control points', () => {
    const commands: Command[] = [
      { type: 'M', position: { x: 10, y: 20 } },
      { type: 'L', position: { x: 30, y: 5 } },
      {
        type: 'C',
        controlPoint1: createControlPoint(15, 40),
        controlPoint2: createControlPoint(-5, 0),
        position: { x: 25, y: 35 },
      },
      { type: 'Z' },
    ];

    expect(calculateRawCommandsBounds(commands)).toEqual({
      minX: -5,
      minY: 0,
      maxX: 30,
      maxY: 40,
    });
  });

  it('applies stroke-width adjustment with zoom normalization', () => {
    const commands: Command[] = [
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 10, y: 10 } },
    ];

    expect(
      calculateRawCommandsBounds(commands, {
        includeStroke: true,
        strokeWidth: 4,
        zoom: 2,
      })
    ).toEqual({
      minX: -1,
      minY: -1,
      maxX: 11,
      maxY: 11,
    });
  });

  it('returns null when commands/subpaths are empty', () => {
    expect(calculateRawCommandsBounds([])).toBeNull();
    expect(calculateRawSubPathsBounds([])).toBeNull();
  });

  it('calculates bounds across multiple subpaths', () => {
    const subPaths: Command[][] = [
      [
        { type: 'M', position: { x: 5, y: 5 } },
        { type: 'L', position: { x: 10, y: 10 } },
      ],
      [
        { type: 'M', position: { x: -3, y: 12 } },
        { type: 'L', position: { x: 6, y: -8 } },
      ],
    ];

    expect(calculateRawSubPathsBounds(subPaths)).toEqual({
      minX: -3,
      minY: -8,
      maxX: 10,
      maxY: 12,
    });
  });
});
