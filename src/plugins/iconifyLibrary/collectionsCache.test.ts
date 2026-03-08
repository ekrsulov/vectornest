import { describe, expect, it } from 'vitest';
import {
  buildCollectionsCacheEntry,
  COLLECTIONS_CACHE_HARD_TTL_MS,
  COLLECTIONS_CACHE_REVALIDATE_AFTER_MS,
  COLLECTIONS_CACHE_SOFT_TTL_MS,
  computeCollectionsFingerprint,
  getCollectionsCacheFreshness,
  isCollectionsCacheDifferent,
  parseCollectionsCacheEntry,
  readCollectionsCache,
  shouldRevalidateCollectionsCache,
  writeCollectionsCache,
} from './collectionsCache';
import type { IconifyCollectionSummary } from './iconifyApi';

const FIXTURE_COLLECTIONS: IconifyCollectionSummary[] = [
  {
    prefix: 'tabler',
    name: 'Tabler Icons',
    total: 5800,
    palette: false,
    samples: ['home'],
  },
  {
    prefix: 'mdi',
    name: 'Material Design Icons',
    total: 7200,
    palette: false,
    samples: ['account'],
  },
];

describe('collectionsCache', () => {
  it('computes a stable fingerprint regardless of collection order', () => {
    const left = computeCollectionsFingerprint(FIXTURE_COLLECTIONS);
    const right = computeCollectionsFingerprint([...FIXTURE_COLLECTIONS].reverse());

    expect(left).toBe(right);
  });

  it('classifies cache freshness using soft and hard ttl boundaries', () => {
    const now = 1_000_000;
    const fresh = buildCollectionsCacheEntry(FIXTURE_COLLECTIONS, now - 500);
    const stale = buildCollectionsCacheEntry(
      FIXTURE_COLLECTIONS,
      now - COLLECTIONS_CACHE_SOFT_TTL_MS - 10,
    );
    const expired = buildCollectionsCacheEntry(
      FIXTURE_COLLECTIONS,
      now - COLLECTIONS_CACHE_HARD_TTL_MS - 10,
    );

    expect(getCollectionsCacheFreshness(fresh, now)).toBe('fresh');
    expect(getCollectionsCacheFreshness(stale, now)).toBe('stale');
    expect(getCollectionsCacheFreshness(expired, now)).toBe('expired');
  });

  it('flags stale entries for background revalidation', () => {
    const now = 1_000_000;
    const recent = buildCollectionsCacheEntry(
      FIXTURE_COLLECTIONS,
      now - COLLECTIONS_CACHE_REVALIDATE_AFTER_MS + 100,
    );
    const old = buildCollectionsCacheEntry(
      FIXTURE_COLLECTIONS,
      now - COLLECTIONS_CACHE_REVALIDATE_AFTER_MS - 100,
    );

    expect(shouldRevalidateCollectionsCache(recent, now)).toBe(false);
    expect(shouldRevalidateCollectionsCache(old, now)).toBe(true);
  });

  it('parses and discards malformed cache payloads', () => {
    const valid = parseCollectionsCacheEntry(buildCollectionsCacheEntry(FIXTURE_COLLECTIONS));
    const invalid = parseCollectionsCacheEntry({
      version: 1,
      storedAt: 'bad',
      collections: [],
    });

    expect(valid?.collections).toHaveLength(2);
    expect(invalid).toBeNull();
  });

  it('writes and reads cache entries from localStorage', () => {
    localStorage.clear();
    const written = writeCollectionsCache(FIXTURE_COLLECTIONS);
    const read = readCollectionsCache();

    expect(written).not.toBeNull();
    expect(read).not.toBeNull();
    expect(read?.collections).toEqual(FIXTURE_COLLECTIONS);
  });

  it('detects catalog changes using total count or fingerprint', () => {
    const previous = buildCollectionsCacheEntry(FIXTURE_COLLECTIONS);
    const sameCollections = [...FIXTURE_COLLECTIONS];
    const changedCollections = [
      ...FIXTURE_COLLECTIONS,
      {
        prefix: 'carbon',
        name: 'Carbon',
        total: 1500,
        palette: false,
        samples: ['cloud'],
      },
    ];

    expect(isCollectionsCacheDifferent(previous, sameCollections)).toBe(false);
    expect(isCollectionsCacheDifferent(previous, changedCollections)).toBe(true);
  });
});
