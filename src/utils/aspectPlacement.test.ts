import { describe, expect, it } from 'vitest';

import {
  calculateAspectPlacementRect,
  createAspectPlacementFeedback,
  isPlacementDragSufficient,
  snapPlacementTargetPoint,
} from './aspectPlacement';

describe('aspectPlacement', () => {
  it('snaps the target point to 10px increments when requested', () => {
    const snapped = snapPlacementTargetPoint(
      { x: 10, y: 20 },
      { x: 34, y: 57 },
      true,
    );

    expect(snapped).toEqual({ x: 30, y: 60 });
  });

  it('keeps the source aspect ratio inside the dragged box', () => {
    const rect = calculateAspectPlacementRect(
      { x: 100, y: 80 },
      { x: 220, y: 140 },
      { width: 100, height: 100 },
    );

    expect(rect).toEqual({
      x: 100,
      y: 80,
      width: 60,
      height: 60,
    });
  });

  it('supports single-axis drags without collapsing the other dimension', () => {
    const rect = calculateAspectPlacementRect(
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { width: 24, height: 12 },
    );

    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 60,
    });
  });

  it('anchors correctly when dragging towards negative coordinates', () => {
    const rect = calculateAspectPlacementRect(
      { x: 100, y: 100 },
      { x: 40, y: 20 },
      { width: 2, height: 1 },
    );

    expect(rect).toEqual({
      x: 40,
      y: 70,
      width: 60,
      height: 30,
    });
  });

  it('uses the same movement threshold as shape creation', () => {
    expect(isPlacementDragSufficient({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(false);
    expect(isPlacementDragSufficient({ x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
  });

  it('marks feedback as highlighted while shift snapping is active', () => {
    const feedback = createAspectPlacementFeedback(
      { x: 0, y: 0, width: 87.2, height: 43.6 },
      true,
    );

    expect(feedback).toEqual({
      width: 87,
      height: 44,
      visible: true,
      isShiftPressed: true,
      isMultipleOf10: true,
    });
  });
});
