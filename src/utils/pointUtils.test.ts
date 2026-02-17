import { describe, it, expect } from 'vitest';
import { clientToCanvas } from './pointUtils';
import type { Viewport } from '../types';

describe('pointUtils', () => {
  it('converts client coords to canvas coords using rect and viewport', () => {
    const svgMock = { getBoundingClientRect: () => ({ left: 50, top: 30 }) } as unknown as SVGSVGElement;

    const viewport: Viewport = { zoom: 2, panX: 100, panY: 200 };

    const res = clientToCanvas(260, 230, svgMock, viewport);
    // x: (260 - 50 - 100) / 2 = 55
    // y: (230 - 30 - 200) / 2 = 0
    expect(res.x).toBeCloseTo(55);
    expect(res.y).toBeCloseTo(0);
  });

  it('works when svg is null (rect defaults to 0)', () => {
    const viewport: Viewport = { zoom: 1, panX: 0, panY: 0 };
    const res = clientToCanvas(20, 30, null, viewport);
    expect(res.x).toBe(20);
    expect(res.y).toBe(30);
  });
});
