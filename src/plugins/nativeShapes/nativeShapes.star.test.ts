import { describe, it, expect } from 'vitest';
import { generateStarPoints } from './index';

function centroid(points: { x: number; y: number }[]) {
  const s = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / points.length, y: s.y / points.length };
}

describe('generateStarPoints', () => {
  it('generates 2*n vertices for n tips (n between 5 and 8)', () => {
    for (let n = 5; n <= 8; n++) {
      const pts = generateStarPoints(n, 80);
      expect(pts.length).toBe(n * 2);
    }
  });

  it('alternates outer and inner radii (outer > inner)', () => {
    for (let n = 5; n <= 8; n++) {
      const pts = generateStarPoints(n, 80, 0.4);
      const c = centroid(pts);
      const dists = pts.map(p => Math.hypot(p.x - c.x, p.y - c.y));
      // outer points should be larger than inner points
      for (let i = 0; i < dists.length; i += 2) {
        expect(dists[i]).toBeGreaterThan(dists[i + 1]);
      }
    }
  });
});
