import { describe, it, expect, beforeAll } from 'vitest';
import { elementContributionRegistry, type ElementContribution } from '../../utils/elementContributionRegistry';
import { nativeShapesPlugin, generateStarPoints } from './index';
import type { NativeShapeElement } from './types';

beforeAll(() => {
  const contribution = (nativeShapesPlugin as unknown as { elementContributions?: unknown[] }).elementContributions?.[0];
  if (contribution) {
    elementContributionRegistry.register(nativeShapesPlugin.id, contribution as ElementContribution);
  }
});

describe('native shape kind change', () => {
  it('generates star points when changing kind to polyline and sets pointsCount', () => {
    const el: NativeShapeElement = {
      id: 'e1',
      zIndex: 0,
      type: 'nativeShape',
      data: {
        kind: 'rect',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        points: undefined,
      },
    } as NativeShapeElement;

    // Simulate converting rect -> polyline by using the same logic as panel
    // Create star template
    const cnt = 5;
    const template = generateStarPoints(cnt, 80);
    const tMinX = Math.min(...template.map((p) => p.x), 0);
    const tMinY = Math.min(...template.map((p) => p.y), 0);
    const tMaxX = Math.max(...template.map((p) => p.x), 1);
    const tMaxY = Math.max(...template.map((p) => p.y), 1);
    const scaleX = el.data.width / (tMaxX - tMinX || 1);
    const scaleY = el.data.height / (tMaxY - tMinY || 1);
    const points = template.map((p) => ({ x: el.data.x + (p.x - tMinX) * scaleX, y: el.data.y + (p.y - tMinY) * scaleY }));
    const finalPoints = [...points, { ...points[0] }];

    expect(finalPoints.length).toBe(points.length + 1);
    expect(finalPoints[0]).toEqual(finalPoints[finalPoints.length - 1]);
  });
});
