import { describe, expect, it } from 'vitest';
import {
  filterCollections,
  getVisibleCanvasCenter,
  humanizeIconName,
  parseCollectionResponse,
  parseCollectionsResponse,
  parseSearchResponse,
  prepareIconifySvgForImport,
  splitIconifyName,
} from './iconifyApi';

describe('iconifyApi', () => {
  it('splits full icon names into prefix and icon id', () => {
    expect(splitIconifyName('mdi:home-outline')).toEqual({
      prefix: 'mdi',
      name: 'home-outline',
    });
    expect(splitIconifyName('invalid')).toBeNull();
  });

  it('humanizes icon names for compact labels', () => {
    expect(humanizeIconName('arrow-left-circle')).toBe('Arrow Left Circle');
    expect(humanizeIconName('wifi_off')).toBe('Wifi Off');
  });

  it('parses collection summaries from the collections payload', () => {
    const collections = parseCollectionsResponse({
      mdi: {
        name: 'Material Design Icons',
        total: 7000,
        samples: ['home', 'account'],
        license: { title: 'Apache 2.0', spdx: 'Apache-2.0' },
      },
      tabler: {
        name: 'Tabler Icons',
        total: 5800,
        palette: false,
      },
    });

    expect(collections).toHaveLength(2);
    expect(collections[0]).toMatchObject({
      prefix: 'mdi',
      name: 'Material Design Icons',
      total: 7000,
      samples: ['home', 'account'],
    });
    expect(collections[1]).toMatchObject({
      prefix: 'tabler',
      name: 'Tabler Icons',
      total: 5800,
    });
  });

  it('parses a collection payload and merges icon sources without duplicates', () => {
    const detail = parseCollectionResponse({
      prefix: 'tabler',
      name: 'Tabler Icons',
      total: 4,
      samples: ['home'],
      icons: ['home', 'star'],
      categories: {
        arrows: ['arrow-left', 'arrow-right'],
        basics: ['home'],
      },
      uncategorized: ['star'],
    }, 'tabler');

    expect(detail).not.toBeNull();
    expect(detail?.icons).toEqual(['home', 'star', 'arrow-left', 'arrow-right']);
    expect(detail?.categories).toEqual([
      { name: 'arrows', icons: ['arrow-left', 'arrow-right'] },
      { name: 'basics', icons: ['home'] },
    ]);
  });

  it('parses search results and expands collection names', () => {
    const parsed = parseSearchResponse({
      icons: ['tabler:home', 'mdi:account'],
      total: 103,
      collections: {
        tabler: { name: 'Tabler Icons' },
        mdi: { name: 'Material Design Icons' },
      },
    });

    expect(parsed.total).toBe(103);
    expect(parsed.items).toEqual([
      {
        id: 'tabler:home',
        prefix: 'tabler',
        iconName: 'home',
        name: 'Home',
        collectionName: 'Tabler Icons',
      },
      {
        id: 'mdi:account',
        prefix: 'mdi',
        iconName: 'account',
        name: 'Account',
        collectionName: 'Material Design Icons',
      },
    ]);
  });

  it('filters collections by name, prefix, or category', () => {
    const collections = parseCollectionsResponse({
      tabler: { name: 'Tabler Icons', total: 5800, category: 'General' },
      carbon: { name: 'Carbon', total: 1200, category: 'IBM' },
    });

    expect(filterCollections(collections, 'tab')).toHaveLength(1);
    expect(filterCollections(collections, 'ibm')).toHaveLength(1);
    expect(filterCollections(collections, 'missing')).toHaveLength(0);
  });

  it('computes the visible canvas center from viewport pan and zoom', () => {
    expect(getVisibleCanvasCenter(
      { zoom: 2, panX: 100, panY: -60 },
      { width: 1200, height: 800 },
    )).toEqual({
      x: 250,
      y: 230,
    });
  });

  it('swaps black and white icon colors for dark-mode insertion before resolving currentColor', () => {
    const prepared = prepareIconifySvgForImport(
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="black" stroke="white"/><path fill="currentColor"/></svg>',
      { colorMode: 'dark', monochromeColor: '#000000' },
    );

    expect(prepared).toContain('fill="#ffffff"');
    expect(prepared).toContain('stroke="#000000"');
    expect(prepared).toContain('<path fill="#000000"/>');
  });
});
