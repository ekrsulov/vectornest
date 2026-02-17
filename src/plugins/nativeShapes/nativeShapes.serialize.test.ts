import { describe, it, expect, beforeAll } from 'vitest';
import { elementContributionRegistry, type ElementContribution } from '../../utils/elementContributionRegistry';
import { nativeShapesPlugin } from './index';
import type { NativeShapeElement } from './types';

beforeAll(() => {
  const contribution = (nativeShapesPlugin as unknown as { elementContributions?: ElementContribution[] }).elementContributions?.[0];
  if (contribution) {
    elementContributionRegistry.register(nativeShapesPlugin.id, contribution);
  }
});

describe('nativeShapes serialization', () => {
  it('exports square shapes as rect elements', () => {
    const square: NativeShapeElement = {
      id: 'square1',
      zIndex: 0,
      type: 'nativeShape',
      parentId: null,
      data: {
        kind: 'square',
        x: 10,
        y: 20,
        width: 50,
        height: 60,
        rx: 4,
        ry: 4,
        strokeColor: '#111',
        strokeWidth: 2,
        strokeOpacity: 0.8,
        fillColor: '#fff',
        fillOpacity: 0.5,
      },
    };

    const serialized = elementContributionRegistry.serializeElement(square);

    expect(serialized).toBeTruthy();
    expect(serialized).toContain('<rect ');
    expect(serialized).toContain('x="10"');
    expect(serialized).toContain('y="20"');
    // Height should match the min dimension for square enforcement
    expect(serialized).toContain('width="50"');
    expect(serialized).toContain('height="50"');
    expect(serialized).toContain('rx="4"');
    expect(serialized).toContain('ry="4"');
  });
});
