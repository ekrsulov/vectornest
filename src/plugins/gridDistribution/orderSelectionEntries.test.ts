import { describe, expect, it } from 'vitest';
import { sortEntriesForGrid } from './orderSelectionEntries';

type TestEntry = {
  id: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
};

const entry = (id: string, minX: number, minY: number, width = 10, height = 10): TestEntry => ({
  id,
  bounds: {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
  },
});

describe('sortEntriesForGrid', () => {
  it('orders entries top-to-bottom and left-to-right by current position', () => {
    const input: TestEntry[] = [
      entry('d', 100, 100),
      entry('b', 100, 0),
      entry('c', 0, 100),
      entry('a', 0, 0),
    ];

    const result = sortEntriesForGrid(input);

    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps near-aligned items in the same row and sorts them by X', () => {
    const input: TestEntry[] = [
      entry('row1-right', 60, 2, 20, 20),
      entry('row2-left', 0, 50, 20, 20),
      entry('row1-left', 0, 0, 20, 20),
      entry('row2-right', 60, 52, 20, 20),
    ];

    const result = sortEntriesForGrid(input);

    expect(result.map((item) => item.id)).toEqual([
      'row1-left',
      'row1-right',
      'row2-left',
      'row2-right',
    ]);
  });
});
