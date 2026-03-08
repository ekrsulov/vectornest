import type { IconifyCollectionSummary } from './iconifyApi';

const CACHE_KEY = 'vectornest:iconify:collections-cache:v1';

export const COLLECTIONS_CACHE_SOFT_TTL_MS = 1000 * 60 * 60 * 12;
export const COLLECTIONS_CACHE_HARD_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const COLLECTIONS_CACHE_REVALIDATE_AFTER_MS = 1000 * 60 * 60;

export type CollectionsCacheFreshness = 'fresh' | 'stale' | 'expired';

export interface CollectionsCacheEntry {
  version: 1;
  storedAt: number;
  totalCollections: number;
  prefixFingerprint: string;
  collections: IconifyCollectionSummary[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const isValidCollectionSummary = (value: unknown): value is IconifyCollectionSummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.prefix === 'string' &&
    typeof value.name === 'string' &&
    typeof value.total === 'number' &&
    typeof value.palette === 'boolean' &&
    Array.isArray(value.samples)
  );
};

export const getCollectionsCacheKey = (): string => CACHE_KEY;

export const computeCollectionsFingerprint = (
  collections: Array<Pick<IconifyCollectionSummary, 'prefix' | 'total'>>
): string => {
  const ordered = [...collections]
    .map((collection) => `${collection.prefix}:${collection.total}`)
    .sort((left, right) => left.localeCompare(right));
  let hash = 5381;

  ordered.forEach((item) => {
    for (let index = 0; index < item.length; index += 1) {
      hash = ((hash << 5) + hash) ^ item.charCodeAt(index);
    }
  });

  return `${ordered.length}:${(hash >>> 0).toString(36)}`;
};

export const buildCollectionsCacheEntry = (
  collections: IconifyCollectionSummary[],
  storedAt = Date.now()
): CollectionsCacheEntry => ({
  version: 1,
  storedAt,
  totalCollections: collections.length,
  prefixFingerprint: computeCollectionsFingerprint(collections),
  collections,
});

export const getCollectionsCacheFreshness = (
  entry: CollectionsCacheEntry,
  now = Date.now()
): CollectionsCacheFreshness => {
  const age = now - entry.storedAt;

  if (age >= COLLECTIONS_CACHE_HARD_TTL_MS) {
    return 'expired';
  }

  if (age >= COLLECTIONS_CACHE_SOFT_TTL_MS) {
    return 'stale';
  }

  return 'fresh';
};

export const shouldRevalidateCollectionsCache = (
  entry: CollectionsCacheEntry,
  now = Date.now()
): boolean => (
  now - entry.storedAt >= COLLECTIONS_CACHE_REVALIDATE_AFTER_MS
);

export const parseCollectionsCacheEntry = (value: unknown): CollectionsCacheEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const collections = Array.isArray(value.collections)
    ? value.collections.filter(isValidCollectionSummary)
    : null;
  if (!collections || collections.length === 0) {
    return null;
  }

  const storedAt = typeof value.storedAt === 'number' ? value.storedAt : NaN;
  if (!Number.isFinite(storedAt) || storedAt <= 0) {
    return null;
  }

  const totalCollections = typeof value.totalCollections === 'number'
    ? value.totalCollections
    : collections.length;
  const prefixFingerprint = typeof value.prefixFingerprint === 'string' && value.prefixFingerprint
    ? value.prefixFingerprint
    : computeCollectionsFingerprint(collections);

  return {
    version: 1,
    storedAt,
    totalCollections,
    prefixFingerprint,
    collections,
  };
};

export const readCollectionsCache = (
  storage: StorageLike | null | undefined = typeof localStorage === 'undefined' ? null : localStorage
): CollectionsCacheEntry | null => {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    return parseCollectionsCacheEntry(JSON.parse(raw));
  } catch {
    storage.removeItem(CACHE_KEY);
    return null;
  }
};

export const writeCollectionsCache = (
  collections: IconifyCollectionSummary[],
  storage: StorageLike | null | undefined = typeof localStorage === 'undefined' ? null : localStorage
): CollectionsCacheEntry | null => {
  if (!storage || collections.length === 0) {
    return null;
  }

  const entry = buildCollectionsCacheEntry(collections);

  try {
    storage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    return entry;
  }

  return entry;
};

export const isCollectionsCacheDifferent = (
  previous: CollectionsCacheEntry | null,
  nextCollections: IconifyCollectionSummary[]
): boolean => {
  if (!previous) {
    return true;
  }

  return (
    previous.totalCollections !== nextCollections.length ||
    previous.prefixFingerprint !== computeCollectionsFingerprint(nextCollections)
  );
};
