import { describe, it, expect, beforeEach } from 'vitest';
import { canvasStoreApi } from '../../store/canvasStore';
import { generateStarPoints } from './index';
import type { NativeShapeElement } from './types';

beforeEach(() => {
  // Reset store to clean state
  canvasStoreApi.setState({ elements: [], selectedIds: [] });
});

describe('editing native shape kind', () => {
  it('updates element kind and regenerates points when changing to polyline', () => {
    const api = canvasStoreApi.getState();
    const rectData: NativeShapeElement['data'] = {
      kind: 'rect',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    };

    const elementId = api.addElement({
      type: 'nativeShape',
      data: rectData,
    });
    api.selectElement(elementId, false);

    // Simulate panel's kind change: compute new points and update
    const cnt = 5;
    const template = generateStarPoints(cnt, 80);
    const tMinX = Math.min(...template.map((p) => p.x), 0);
    const tMinY = Math.min(...template.map((p) => p.y), 0);
    const tMaxX = Math.max(...template.map((p) => p.x), 1);
    const tMaxY = Math.max(...template.map((p) => p.y), 1);
    const scaleX = rectData.width / (tMaxX - tMinX || 1);
    const scaleY = rectData.height / (tMaxY - tMinY || 1);
    const points = template.map((p) => ({
      x: rectData.x + (p.x - tMinX) * scaleX,
      y: rectData.y + (p.y - tMinY) * scaleY,
    }));
    const finalPoints = [...points, { ...points[0] }];

    api.updateElement(elementId, {
      data: { ...rectData, kind: 'polyline', pointsCount: cnt, points: finalPoints },
    });

    const updated = canvasStoreApi
      .getState()
      .elements.find((element) => element.id === elementId);

    expect(updated).toBeTruthy();
    const shapeData = updated?.data as NativeShapeElement['data'];
    expect(shapeData.kind).toBe('polyline');
    expect(Array.isArray(shapeData.points)).toBe(true);
    expect(shapeData.points?.length).toBe(finalPoints.length);
    expect(shapeData.points?.[0]).toEqual(shapeData.points?.[shapeData.points!.length - 1]);
  });
});
