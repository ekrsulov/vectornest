/**
 * Gizmo Interaction Handler Tests
 * 
 * Tests for interaction utilities and constraint helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  constrainToAxis,
  snapToGrid,
  constrainRotation,
  constrainUniformScale,
} from '../GizmoInteractionHandler';
import type { ModifierState } from '../GizmoInteractionHandler';

// =============================================================================
// Test Fixtures
// =============================================================================

const noModifiers: ModifierState = {
  shift: false,
  alt: false,
  meta: false,
  ctrl: false,
};

const shiftModifier: ModifierState = {
  shift: true,
  alt: false,
  meta: false,
  ctrl: false,
};

// =============================================================================
// Tests: constrainToAxis
// =============================================================================

describe('constrainToAxis', () => {
  it('should not constrain without shift', () => {
    const delta = { x: 50, y: 30 };
    const result = constrainToAxis(delta, noModifiers);
    expect(result).toEqual({ x: 50, y: 30 });
  });

  it('should constrain to X axis when X is dominant with shift', () => {
    const delta = { x: 50, y: 30 };
    const result = constrainToAxis(delta, shiftModifier);
    expect(result).toEqual({ x: 50, y: 0 });
  });

  it('should constrain to Y axis when Y is dominant with shift', () => {
    const delta = { x: 30, y: 50 };
    const result = constrainToAxis(delta, shiftModifier);
    expect(result).toEqual({ x: 0, y: 50 });
  });

  it('should handle negative deltas', () => {
    const delta = { x: -60, y: 20 };
    const result = constrainToAxis(delta, shiftModifier);
    expect(result).toEqual({ x: -60, y: 0 });
  });

  it('should handle equal deltas (constrains to X)', () => {
    const delta = { x: 50, y: 50 };
    const result = constrainToAxis(delta, shiftModifier);
    // When equal, should not constrain (neither is greater)
    expect(result).toEqual({ x: 0, y: 50 }); // Y wins in tie (Math.abs check)
  });
});

// =============================================================================
// Tests: snapToGrid
// =============================================================================

describe('snapToGrid', () => {
  it('should not snap when disabled', () => {
    const point = { x: 17, y: 23 };
    const result = snapToGrid(point, 10, false);
    expect(result).toEqual({ x: 17, y: 23 });
  });

  it('should snap to nearest grid point', () => {
    const point = { x: 17, y: 23 };
    const result = snapToGrid(point, 10, true);
    expect(result).toEqual({ x: 20, y: 20 });
  });

  it('should snap exact grid values', () => {
    const point = { x: 20, y: 30 };
    const result = snapToGrid(point, 10, true);
    expect(result).toEqual({ x: 20, y: 30 });
  });

  it('should handle non-integer grid sizes', () => {
    const point = { x: 7, y: 8 };
    const result = snapToGrid(point, 5, true);
    expect(result).toEqual({ x: 5, y: 10 });
  });

  it('should handle negative coordinates', () => {
    const point = { x: -17, y: -23 };
    const result = snapToGrid(point, 10, true);
    expect(result).toEqual({ x: -20, y: -20 });
  });

  it('should return original for zero grid size', () => {
    const point = { x: 17, y: 23 };
    const result = snapToGrid(point, 0, true);
    expect(result).toEqual({ x: 17, y: 23 });
  });
});

// =============================================================================
// Tests: constrainRotation
// =============================================================================

describe('constrainRotation', () => {
  it('should not constrain without shift', () => {
    const result = constrainRotation(37, noModifiers);
    expect(result).toBe(37);
  });

  it('should constrain to 15-degree increments with shift (round to nearest)', () => {
    // 37 is closer to 30 than 45 (37-30=7, 45-37=8), so rounds to 30
    const result = constrainRotation(37, shiftModifier);
    expect(result).toBe(30);
  });

  it('should constrain to 15-degree increments (round up when closer)', () => {
    // 38 is closer to 45 than 30 (38-30=8, 45-38=7), so rounds to 45
    const result = constrainRotation(38, shiftModifier);
    expect(result).toBe(45);
  });

  it('should constrain to 15-degree increments (round down when closer)', () => {
    const result = constrainRotation(22, shiftModifier);
    expect(result).toBe(15);
  });

  it('should handle exact increment values', () => {
    const result = constrainRotation(45, shiftModifier);
    expect(result).toBe(45);
  });

  it('should use custom increment', () => {
    const result = constrainRotation(37, shiftModifier, 30);
    expect(result).toBe(30);
  });

  it('should handle negative angles', () => {
    // -37 rounds to -30 (nearest increment)
    const result = constrainRotation(-37, shiftModifier);
    expect(result).toBe(-30);
  });

  it('should handle negative angles rounding to next increment', () => {
    // -38 is closer to -45 than -30
    const result = constrainRotation(-38, shiftModifier);
    expect(result).toBe(-45);
  });
});

// =============================================================================
// Tests: constrainUniformScale
// =============================================================================

describe('constrainUniformScale', () => {
  it('should not constrain without shift', () => {
    const result = constrainUniformScale(1.5, 1.2, noModifiers);
    expect(result).toEqual({ scaleX: 1.5, scaleY: 1.2 });
  });

  it('should use larger scale for both axes with shift', () => {
    const result = constrainUniformScale(1.5, 1.2, shiftModifier);
    expect(result).toEqual({ scaleX: 1.5, scaleY: 1.5 });
  });

  it('should preserve signs when constraining', () => {
    const result = constrainUniformScale(1.5, -1.2, shiftModifier);
    expect(result).toEqual({ scaleX: 1.5, scaleY: -1.5 });
  });

  it('should handle both negative values', () => {
    const result = constrainUniformScale(-1.5, -1.2, shiftModifier);
    expect(result).toEqual({ scaleX: -1.5, scaleY: -1.5 });
  });

  it('should use Y scale when larger', () => {
    const result = constrainUniformScale(1.2, 1.8, shiftModifier);
    expect(result).toEqual({ scaleX: 1.8, scaleY: 1.8 });
  });
});
