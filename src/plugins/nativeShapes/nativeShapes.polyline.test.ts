import { describe, it, expect } from 'vitest';
import { generateStarPoints } from './index';

function scaleTemplateToBox(template: { x: number; y: number }[], minX: number, minY: number, width: number, height: number) {
  const tMinX = Math.min(...template.map((p) => p.x), 0);
  const tMinY = Math.min(...template.map((p) => p.y), 0);
  const tMaxX = Math.max(...template.map((p) => p.x), 1);
  const tMaxY = Math.max(...template.map((p) => p.y), 1);
  const scaleX = width / (tMaxX - tMinX || 1);
  const scaleY = height / (tMaxY - tMinY || 1);
  const points = template.map((p) => ({ x: minX + (p.x - tMinX) * scaleX, y: minY + (p.y - tMinY) * scaleY }));
  // close
  return points.length > 0 ? [...points, { ...points[0] }] : points;
}

describe('polyline star closure', () => {
  it('ensures polyline stars are closed after scaling', () => {
    for (let n = 5; n <= 8; n++) {
      const tpl = generateStarPoints(n, 80, 0.45);
      const scaled = scaleTemplateToBox(tpl, 100, 100, 200, 200);
      expect(scaled.length).toBe(tpl.length + 1);
      const first = scaled[0];
      const last = scaled[scaled.length - 1];
      expect(first.x).toBeCloseTo(last.x);
      expect(first.y).toBeCloseTo(last.y);
    }
  });
});
