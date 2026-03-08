import { describe, expect, it } from 'vitest';
import { translateImportedElements } from './importHelpers';
import { calculateImportedElementBounds } from './importProcessingUtils';
import type { ImportedElement } from './svgImportUtils';

const createScaledGroup = (): ImportedElement[] => [
  {
    type: 'group',
    data: {
      transformMatrix: [4, 0, 0, 4, 0, 0],
    },
    children: [
      {
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x: 0, y: 0 } },
            { type: 'L', position: { x: 24, y: 0 } },
            { type: 'L', position: { x: 24, y: 24 } },
            { type: 'L', position: { x: 0, y: 24 } },
            { type: 'Z' },
          ]],
          strokeWidth: 0,
          strokeColor: 'none',
          strokeOpacity: 1,
          fillColor: '#000000',
          fillOpacity: 1,
        },
      },
    ],
  },
];

describe('importHelpers translation', () => {
  it('translates imported groups by matrix instead of scaling the child movement', () => {
    const translated = translateImportedElements(createScaledGroup(), 100, 200);
    const group = translated[0];

    expect(group.type).toBe('group');
    expect(group.data?.transformMatrix).toEqual([4, 0, 0, 4, 100, 200]);
  });
});

describe('calculateImportedElementBounds', () => {
  it('includes group transform matrices when measuring imported bounds', () => {
    const bounds = calculateImportedElementBounds(createScaledGroup());

    expect(bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 96,
      maxY: 96,
      width: 96,
      height: 96,
    });
  });
});
