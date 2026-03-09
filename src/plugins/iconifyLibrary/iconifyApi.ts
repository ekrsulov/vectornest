import type { Viewport } from '../../types';
import { transformMonoColor, type ThemeColorMode } from '../../utils/colorModeSyncUtils';
import { sanitizeSvgContent } from '../../utils/sanitizeSvgContent';

const ICONIFY_API_BASE = 'https://api.iconify.design';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const CURRENT_COLOR_PATTERN = /\bcurrentColor\b/gi;
const DEFINITION_LIKE_TAGS = new Set(['defs', 'desc', 'metadata', 'style', 'title']);
const MONO_HEX_PATTERN = /#(?:000|000000|fff|ffffff)\b/gi;
const MONO_NAMED_PATTERN = /\b(?:black|white)\b/gi;
const iconifySvgCache = new Map<string, string>();

export const ICONS_PER_PAGE = 24;
export const MAX_SEARCH_RESULTS = 96;
export const DEFAULT_INSERT_ICON_SIZE = 96;

export const FEATURED_COLLECTION_PREFIXES = [
  'tabler',
  'lucide',
  'mdi-light',
  'material-symbols',
  'ph',
  'solar',
  'carbon',
  'mingcute',
];

export interface IconifyAuthor {
  name: string;
  url?: string;
}

export interface IconifyLicense {
  title?: string;
  spdx?: string;
  url?: string;
}

export interface IconifyCollectionSummary {
  prefix: string;
  name: string;
  total: number;
  palette: boolean;
  samples: string[];
  category?: string;
  author?: IconifyAuthor;
  license?: IconifyLicense;
}

export interface IconifyCollectionCategory {
  name: string;
  icons: string[];
}

export interface IconifyCollectionDetail extends IconifyCollectionSummary {
  icons: string[];
  categories: IconifyCollectionCategory[];
}

export interface IconifySearchResult {
  id: string;
  prefix: string;
  iconName: string;
  name: string;
  collectionName: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const isPresent = <T>(value: T | null | undefined): value is T => value != null;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const toStringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []
);

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    result.push(value);
  });

  return result;
};

const normalizeLicense = (value: unknown): IconifyLicense | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const title = typeof value.title === 'string' ? value.title : undefined;
  const spdx = typeof value.spdx === 'string' ? value.spdx : undefined;
  const url = typeof value.url === 'string' ? value.url : undefined;

  if (!title && !spdx && !url) {
    return undefined;
  }

  return { title, spdx, url };
};

const normalizeAuthor = (value: unknown): IconifyAuthor | undefined => {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) {
    return undefined;
  }

  return {
    name: value.name,
    url: typeof value.url === 'string' ? value.url : undefined,
  };
};

export const humanizeIconName = (value: string): string => (
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

export const splitIconifyName = (value: string): { prefix: string; name: string } | null => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  return {
    prefix: value.slice(0, separatorIndex),
    name: value.slice(separatorIndex + 1),
  };
};

export const buildCollectionsUrl = (): string => `${ICONIFY_API_BASE}/collections`;

export const buildCollectionUrl = (prefix: string): string => {
  const params = new URLSearchParams({ prefix });
  return `${ICONIFY_API_BASE}/collection?${params.toString()}`;
};

export const buildSearchUrl = (
  query: string,
  options: { limit?: number; prefix?: string } = {}
): string => {
  const params = new URLSearchParams({
    query,
    limit: String(options.limit ?? MAX_SEARCH_RESULTS),
  });

  if (options.prefix) {
    params.set('prefix', options.prefix);
  }

  return `${ICONIFY_API_BASE}/search?${params.toString()}`;
};

export const buildIconSvgUrl = (
  prefix: string,
  iconName: string,
  options: { height?: number } = {}
): string => {
  const baseUrl = `${ICONIFY_API_BASE}/${prefix}/${iconName}.svg`;
  if (!options.height) {
    return baseUrl;
  }

  const params = new URLSearchParams({ height: String(options.height) });
  return `${baseUrl}?${params.toString()}`;
};

export const getIconifyCacheKey = (prefix: string, iconName: string): string => (
  `${prefix}:${iconName}`
);

export const getCachedIconifySvg = (iconId: string): string | null => (
  iconifySvgCache.get(iconId) ?? null
);

export const loadIconifySvg = async (
  prefix: string,
  iconName: string,
  options: { signal?: AbortSignal } = {},
): Promise<string> => {
  const iconId = getIconifyCacheKey(prefix, iconName);
  const cached = getCachedIconifySvg(iconId);
  if (cached) {
    return cached;
  }

  const response = await fetch(buildIconSvgUrl(prefix, iconName), {
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Icon request failed with ${response.status}`);
  }

  const svg = sanitizeSvgContent(await response.text(), { allowExternalUrls: false });
  iconifySvgCache.set(iconId, svg);
  return svg;
};

export const parseCollectionsResponse = (payload: unknown): IconifyCollectionSummary[] => {
  const source = isRecord(payload) && isRecord(payload.collections)
    ? payload.collections
    : isRecord(payload)
      ? payload
      : null;

  if (!source) {
    return [];
  }

  return Object.entries(source)
    .map<IconifyCollectionSummary | null>(([prefix, value]) => {
      if (!isRecord(value)) {
        return null;
      }

      const total = toFiniteNumber(value.total) ?? 0;
      const name = typeof value.name === 'string' && value.name.trim() ? value.name : prefix;
      const samples = unique([
        ...toStringArray(value.samples),
        ...toStringArray(value.uncategorized).slice(0, 6),
      ]).slice(0, 6);

      return {
        prefix,
        name,
        total,
        palette: Boolean(value.palette),
        samples,
        category: typeof value.category === 'string' ? value.category : undefined,
        author: normalizeAuthor(value.author),
        license: normalizeLicense(value.license),
      };
    })
    .filter(isPresent)
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const parseCollectionResponse = (
  payload: unknown,
  fallbackPrefix: string
): IconifyCollectionDetail | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const prefix = typeof payload.prefix === 'string' && payload.prefix.trim()
    ? payload.prefix
    : fallbackPrefix;
  const name = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name
    : prefix;

  const iconArray = Array.isArray(payload.icons)
    ? toStringArray(payload.icons)
    : isRecord(payload.icons)
      ? Object.keys(payload.icons)
      : [];
  const categoriesRecord = isRecord(payload.categories) ? payload.categories : {};
  const categories = Object.entries(categoriesRecord)
    .map(([categoryName, icons]) => ({
      name: categoryName,
      icons: toStringArray(icons),
    }))
    .filter((category) => category.icons.length > 0);
  const uncategorized = toStringArray(payload.uncategorized);
  const samples = unique([
    ...toStringArray(payload.samples),
    ...uncategorized.slice(0, 6),
    ...categories.flatMap((category) => category.icons.slice(0, 2)),
  ]).slice(0, 6);
  const icons = unique([
    ...iconArray,
    ...categories.flatMap((category) => category.icons),
    ...uncategorized,
    ...samples,
  ]);

  return {
    prefix,
    name,
    total: toFiniteNumber(payload.total) ?? icons.length,
    palette: Boolean(payload.palette),
    samples,
    category: typeof payload.category === 'string' ? payload.category : undefined,
    author: normalizeAuthor(payload.author),
    license: normalizeLicense(payload.license),
    icons,
    categories,
  };
};

export const parseSearchResponse = (
  payload: unknown
): { items: IconifySearchResult[]; total: number } => {
  if (!isRecord(payload)) {
    return { items: [], total: 0 };
  }

  const collections = isRecord(payload.collections) ? payload.collections : {};
  const items = toStringArray(payload.icons)
    .map<IconifySearchResult | null>((fullName) => {
      const split = splitIconifyName(fullName);
      if (!split) {
        return null;
      }

      const collection = collections[split.prefix];
      const collectionName = isRecord(collection) && typeof collection.name === 'string' && collection.name.trim()
        ? collection.name
        : split.prefix;

      return {
        id: fullName,
        prefix: split.prefix,
        iconName: split.name,
        name: humanizeIconName(split.name),
        collectionName,
      };
    })
    .filter(isPresent);

  return {
    items,
    total: toFiniteNumber(payload.total) ?? items.length,
  };
};

export const pickFeaturedCollections = (
  collections: IconifyCollectionSummary[],
  maxItems = 6
): IconifyCollectionSummary[] => {
  const byPrefix = new Map(collections.map((collection) => [collection.prefix, collection]));
  const featured = FEATURED_COLLECTION_PREFIXES
    .map((prefix) => byPrefix.get(prefix) ?? null)
    .filter((entry): entry is IconifyCollectionSummary => entry !== null);

  if (featured.length >= maxItems) {
    return featured.slice(0, maxItems);
  }

  const remainder = collections
    .filter((collection) => !FEATURED_COLLECTION_PREFIXES.includes(collection.prefix))
    .sort((left, right) => {
      const totalDiff = right.total - left.total;
      return totalDiff !== 0 ? totalDiff : left.name.localeCompare(right.name);
    });

  return [...featured, ...remainder].slice(0, maxItems);
};

export const filterCollections = (
  collections: IconifyCollectionSummary[],
  query: string
): IconifyCollectionSummary[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return collections;
  }

  return collections.filter((collection) => (
    collection.name.toLowerCase().includes(normalizedQuery) ||
    collection.prefix.toLowerCase().includes(normalizedQuery) ||
    (collection.category?.toLowerCase().includes(normalizedQuery) ?? false)
  ));
};

const parseViewBox = (value: string | null): { minX: number; minY: number; width: number; height: number } | null => {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(/\s+/).map((entry) => Number.parseFloat(entry));
  if (parts.length !== 4 || parts.some((entry) => !Number.isFinite(entry))) {
    return null;
  }

  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
};

const extractSvgBounds = (svg: Element): { minX: number; minY: number; width: number; height: number } | null => {
  const viewBox = parseViewBox(svg.getAttribute('viewBox'));
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return viewBox;
  }

  const width = toFiniteNumber(svg.getAttribute('width'));
  const height = toFiniteNumber(svg.getAttribute('height'));
  if (width !== null && width > 0 && height !== null && height > 0) {
    return {
      minX: 0,
      minY: 0,
      width,
      height,
    };
  }

  return null;
};

export const getIconifySvgBounds = (
  rawSvg: string,
): { minX: number; minY: number; width: number; height: number } | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg || doc.querySelector('parsererror')) {
    return null;
  }

  return extractSvgBounds(svg);
};

const normalizeMonoPreviewColor = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '#000' || normalized === '#000000' || normalized === 'black') {
    return '#000000';
  }
  if (normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') {
    return '#ffffff';
  }
  return null;
};

const swapMonoPreviewColor = (value: string, targetMode: ThemeColorMode): string => {
  const normalized = normalizeMonoPreviewColor(value);
  if (!normalized) {
    return value;
  }

  return transformMonoColor(normalized, targetMode);
};

const swapMonoPreviewTokensInText = (value: string, targetMode: ThemeColorMode): string => (
  value
    .replace(MONO_HEX_PATTERN, (match) => swapMonoPreviewColor(match, targetMode))
    .replace(MONO_NAMED_PATTERN, (match) => swapMonoPreviewColor(match, targetMode))
);

const prepareIconifyMarkupTokens = (
  rawSvg: string,
  options: { colorMode?: ThemeColorMode; monochromeColor?: string } = {},
): string => {
  const colorMode = options.colorMode ?? 'light';
  let nextSvg = swapMonoPreviewTokensInText(rawSvg, colorMode);

  if (options.monochromeColor) {
    nextSvg = nextSvg.replace(CURRENT_COLOR_PATTERN, options.monochromeColor);
  }

  return nextSvg;
};

const shouldWrapForScaling = (node: ChildNode): node is Element => {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  return !DEFINITION_LIKE_TAGS.has((node as Element).tagName.toLowerCase());
};

export const prepareIconifySvgForImport = (
  rawSvg: string,
  options: { monochromeColor?: string; targetMaxSize?: number; colorMode?: ThemeColorMode } = {}
): string => {
  const preparedMarkup = prepareIconifyMarkupTokens(rawSvg, options);
  if (typeof DOMParser === 'undefined') {
    return preparedMarkup;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(preparedMarkup, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg || doc.querySelector('parsererror')) {
    return preparedMarkup;
  }

  const bounds = extractSvgBounds(svg);
  const targetMaxSize = options.targetMaxSize ?? 0;
  if (bounds && targetMaxSize > 0) {
    const scale = targetMaxSize / Math.max(bounds.width, bounds.height);
    if (Number.isFinite(scale) && Math.abs(scale - 1) > 0.001) {
      const wrapper = doc.createElementNS(SVG_NAMESPACE, 'g');
      wrapper.setAttribute(
        'transform',
        `translate(${bounds.minX} ${bounds.minY}) scale(${scale}) translate(${-bounds.minX} ${-bounds.minY})`
      );

      const movableChildren = Array.from(svg.childNodes).filter(shouldWrapForScaling);
      movableChildren.forEach((child) => wrapper.appendChild(child));

      if (movableChildren.length > 0) {
        svg.appendChild(wrapper);
      }
    }
  }

  return new XMLSerializer().serializeToString(svg);
};

export const prepareIconifySvgForPreview = (
  rawSvg: string,
  options: { colorMode?: ThemeColorMode } = {},
): string => {
  const preparedMarkup = prepareIconifyMarkupTokens(rawSvg, options);
  if (typeof DOMParser === 'undefined') {
    return preparedMarkup;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(preparedMarkup, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg || doc.querySelector('parsererror')) {
    return preparedMarkup;
  }

  return new XMLSerializer().serializeToString(svg);
};

export const getVisibleCanvasCenter = (
  viewport: Viewport,
  canvasSize: { width: number; height: number }
): { x: number; y: number } => ({
  x: (canvasSize.width / 2 - viewport.panX) / viewport.zoom,
  y: (canvasSize.height / 2 - viewport.panY) / viewport.zoom,
});
