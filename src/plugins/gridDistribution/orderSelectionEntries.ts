type BoundsLike = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type EntryWithBounds = {
  bounds: BoundsLike;
};

type IndexedEntry<T extends EntryWithBounds> = {
  index: number;
  entry: T;
  centerX: number;
  centerY: number;
  height: number;
};

const centerX = (bounds: BoundsLike): number => (bounds.minX + bounds.maxX) / 2;
const centerY = (bounds: BoundsLike): number => (bounds.minY + bounds.maxY) / 2;
const height = (bounds: BoundsLike): number => Math.max(bounds.maxY - bounds.minY, 0);

/**
 * Orders entries by visual reading order for grid placement:
 * top-to-bottom by rows, and left-to-right within each row.
 */
export const sortEntriesForGrid = <T extends EntryWithBounds>(entries: T[]): T[] => {
  if (entries.length < 2) {
    return [...entries];
  }

  const indexed: IndexedEntry<T>[] = entries.map((entry, index) => ({
    index,
    entry,
    centerX: centerX(entry.bounds),
    centerY: centerY(entry.bounds),
    height: height(entry.bounds),
  }));

  const averageHeight = indexed.reduce((sum, item) => sum + item.height, 0) / indexed.length;
  const rowTolerance = Math.max(1, averageHeight * 0.35);

  const pending = [...indexed].sort((a, b) => (
    a.centerY - b.centerY ||
    a.centerX - b.centerX ||
    a.index - b.index
  ));

  const ordered: T[] = [];

  while (pending.length > 0) {
    const baselineY = pending[0].centerY;
    const row: IndexedEntry<T>[] = [];
    const rest: IndexedEntry<T>[] = [];

    pending.forEach((item) => {
      if (Math.abs(item.centerY - baselineY) <= rowTolerance) {
        row.push(item);
        return;
      }
      rest.push(item);
    });

    row.sort((a, b) => (
      a.centerX - b.centerX ||
      a.centerY - b.centerY ||
      a.index - b.index
    ));

    ordered.push(...row.map((item) => item.entry));

    pending.length = 0;
    pending.push(...rest);
  }

  return ordered;
};
