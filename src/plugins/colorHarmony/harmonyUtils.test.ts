import { describe, expect, it } from 'vitest';
import { hueToRadians, normalizeHue, wheelPointFromHue } from './harmonyUtils';

describe('harmonyUtils wheel geometry', () => {
  it('normalizes hue values into [0, 360)', () => {
    expect(normalizeHue(-30)).toBe(330);
    expect(normalizeHue(390)).toBe(30);
    expect(normalizeHue(720)).toBe(0);
  });

  it('maps cardinal hues to expected wheel directions', () => {
    const centerX = 50;
    const centerY = 50;
    const radius = 10;

    const right = wheelPointFromHue(0, centerX, centerY, radius);
    expect(right.x).toBeCloseTo(60);
    expect(right.y).toBeCloseTo(50);

    const bottom = wheelPointFromHue(90, centerX, centerY, radius);
    expect(bottom.x).toBeCloseTo(50);
    expect(bottom.y).toBeCloseTo(60);

    const left = wheelPointFromHue(180, centerX, centerY, radius);
    expect(left.x).toBeCloseTo(40);
    expect(left.y).toBeCloseTo(50);

    const top = wheelPointFromHue(270, centerX, centerY, radius);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeCloseTo(40);
  });

  it('treats wrapped hues as the same angular position', () => {
    const pointA = wheelPointFromHue(30, 50, 50, 25);
    const pointB = wheelPointFromHue(390, 50, 50, 25);
    const pointC = wheelPointFromHue(-330, 50, 50, 25);

    expect(pointA.x).toBeCloseTo(pointB.x);
    expect(pointA.y).toBeCloseTo(pointB.y);
    expect(pointA.x).toBeCloseTo(pointC.x);
    expect(pointA.y).toBeCloseTo(pointC.y);
  });

  it('returns radians with hue wrapping', () => {
    expect(hueToRadians(0)).toBeCloseTo(0);
    expect(hueToRadians(450)).toBeCloseTo(Math.PI / 2);
    expect(hueToRadians(-90)).toBeCloseTo((3 * Math.PI) / 2);
  });
});
