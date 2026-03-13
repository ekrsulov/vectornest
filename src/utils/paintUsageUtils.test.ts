import { describe, expect, it } from 'vitest';

import { collectUsedPaintIds } from './paintUsageUtils';
import type { CanvasElement } from '../types';

describe('collectUsedPaintIds', () => {
  it('collects gradient ids from use style overrides and raw content', () => {
    const elements = [
      {
        id: 'use-1',
        type: 'use',
        parentId: null,
        zIndex: 0,
        data: {
          href: 'mandala',
          referenceType: 'element',
          x: 0,
          y: 0,
          styleOverrides: {
            fillColor: 'url(#warm)',
          },
          rawContent: '<g fill="url(#cool)"><path d="M0 0" /></g>',
        },
      } as CanvasElement,
    ];

    expect(Array.from(collectUsedPaintIds(elements)).sort()).toEqual(['cool', 'warm']);
  });
});