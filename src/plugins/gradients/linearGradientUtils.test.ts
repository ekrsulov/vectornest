import { describe, expect, it } from 'vitest';
import { coordinatesFromAngle, resolveLinearGradientCoordinates } from './linearGradientUtils';

describe('linearGradientUtils', () => {
  it('derives objectBoundingBox coordinates from angle', () => {
    const coords = coordinatesFromAngle(90);
    expect(coords.x1).toBeCloseTo(0);
    expect(coords.y1).toBeCloseTo(50);
    expect(coords.x2).toBeCloseTo(100);
    expect(coords.y2).toBeCloseTo(50);
  });

  it('prefers explicit coordinates when provided', () => {
    const coords = resolveLinearGradientCoordinates({
      gradientUnits: 'objectBoundingBox',
      angle: 30,
      x1: 12,
      y1: 34,
      x2: 56,
      y2: 78,
    });
    expect(coords).toEqual({ x1: 12, y1: 34, x2: 56, y2: 78 });
  });

  it('uses angle for objectBoundingBox when coordinates are not present', () => {
    const coords = resolveLinearGradientCoordinates({
      gradientUnits: 'objectBoundingBox',
      angle: 0,
      x1: undefined,
      y1: undefined,
      x2: undefined,
      y2: undefined,
    });
    expect(coords.x1).toBeCloseTo(50);
    expect(coords.y1).toBeCloseTo(100);
    expect(coords.x2).toBeCloseTo(50);
    expect(coords.y2).toBeCloseTo(0);
  });

  it('keeps absolute coordinates in userSpaceOnUse mode', () => {
    const coords = resolveLinearGradientCoordinates({
      gradientUnits: 'userSpaceOnUse',
      angle: 270,
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 120,
    });
    expect(coords).toEqual({ x1: 10, y1: 20, x2: 110, y2: 120 });
  });
});
