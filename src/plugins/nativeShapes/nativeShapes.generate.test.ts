import { describe, it, expect } from 'vitest';
import { generateRegularPolygonPoints } from './index';

function centroid(points: { x: number; y: number }[]) {
  const s = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / points.length, y: s.y / points.length };
}

describe('generateRegularPolygonPoints', () => {
  it('generates correct number of points', () => {
    for (let n = 3; n <= 8; n++) {
      const pts = generateRegularPolygonPoints(n, 80);
      expect(pts.length).toBe(n);
    }
  });

  it('produces equidistant vertices from center (approx)', () => {
    for (let n = 3; n <= 8; n++) {
      const pts = generateRegularPolygonPoints(n, 80);
      const c = centroid(pts);
      const dists = pts.map(p => Math.hypot(p.x - c.x, p.y - c.y));
      const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
      // all distances should be within small tolerance of average
      for (const d of dists) {
        expect(Math.abs(d - avg)).toBeLessThan(1e-6);
      }
    }
  });
});
