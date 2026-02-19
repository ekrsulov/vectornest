import type { PatternDef } from './slice';

export type BuiltInPatternType = Exclude<PatternDef['type'], 'raw'>;

const OBJECT_BBOX_LEGACY_SCALE = 100;
const DEFAULT_OBJECT_BBOX_SCALE = 100;
const MIN_OBJECT_BBOX_SCALE = 1;
const MIN_PATTERN_TILE_SIZE = 0.001;

interface PatternTileGeometry {
  units: 'userSpaceOnUse' | 'objectBoundingBox';
  tileWidth: number;
  tileHeight: number;
  contentWidth: number;
  contentHeight: number;
  viewBox?: string;
}

const sanitizeDimension = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return Math.max(MIN_PATTERN_TILE_SIZE, fallback);
  }
  return Math.max(MIN_PATTERN_TILE_SIZE, value);
};

const sanitizeObjectBoundingBoxScale = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_OBJECT_BBOX_SCALE;
  }
  return Math.max(MIN_OBJECT_BBOX_SCALE, value);
};

const applyObjectBoundingBoxScale = (baseTileSize: number, scale: number): number =>
  Math.max(MIN_PATTERN_TILE_SIZE, (baseTileSize * scale) / DEFAULT_OBJECT_BBOX_SCALE);

export const resolvePatternTileGeometry = (
  pattern: Pick<PatternDef, 'patternUnits' | 'scale' | 'size' | 'width' | 'height'>
): PatternTileGeometry => {
  const units = pattern.patternUnits ?? 'userSpaceOnUse';
  const fallbackSize = sanitizeDimension(pattern.size, 8);
  const sourceWidth = sanitizeDimension(pattern.width, fallbackSize);
  const sourceHeight = sanitizeDimension(pattern.height, fallbackSize);
  const objectBoundingBoxScale = sanitizeObjectBoundingBoxScale(pattern.scale);

  if (units !== 'objectBoundingBox') {
    return {
      units,
      tileWidth: sourceWidth,
      tileHeight: sourceHeight,
      contentWidth: sourceWidth,
      contentHeight: sourceHeight,
    };
  }

  // Preserve imported objectBoundingBox patterns that already use normalized [0..1] tile sizes.
  const alreadyNormalized = sourceWidth <= 1 && sourceHeight <= 1;
  if (alreadyNormalized) {
    return {
      units,
      tileWidth: applyObjectBoundingBoxScale(sourceWidth, objectBoundingBoxScale),
      tileHeight: applyObjectBoundingBoxScale(sourceHeight, objectBoundingBoxScale),
      contentWidth: sourceWidth,
      contentHeight: sourceHeight,
    };
  }

  return {
    units,
    tileWidth: applyObjectBoundingBoxScale(sourceWidth / OBJECT_BBOX_LEGACY_SCALE, objectBoundingBoxScale),
    tileHeight: applyObjectBoundingBoxScale(sourceHeight / OBJECT_BBOX_LEGACY_SCALE, objectBoundingBoxScale),
    contentWidth: sourceWidth,
    contentHeight: sourceHeight,
    viewBox: `0 0 ${sourceWidth} ${sourceHeight}`,
  };
};

export const buildBuiltInPatternBody = (
  type: BuiltInPatternType,
  size: number,
  fg: string,
  bg: string
): { content: string; patternTransform?: string } => {
  switch (type) {
    case 'dots':
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="${fg}" />`,
      };
    case 'grid':
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<path d="M0 0 H${size} V${size} H0 Z" fill="none" stroke="${fg}" stroke-width="${Math.max(1, size / 10)}" />`,
      };
    case 'crosshatch':
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<rect width="${Math.max(1, size / 4)}" height="${size}" fill="${fg}" />`,
        patternTransform: 'rotate(45)',
      };
    case 'checker':
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<rect width="${size / 2}" height="${size / 2}" fill="${fg}" />
<rect x="${size / 2}" y="${size / 2}" width="${size / 2}" height="${size / 2}" fill="${fg}" />`,
      };
    case 'diamonds':
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<path d="M${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} L 0 ${size / 2} Z" fill="${fg}" />`,
      };
    case 'stripes':
    default:
      return {
        content: `<rect width="${size}" height="${size}" fill="${bg}" />
<rect width="${size / 2}" height="${size}" fill="${fg}" />`,
        patternTransform: 'rotate(45)',
      };
  }
};

export const normalizeRawPatternContent = (rawContent?: string): string => {
  const trimmed = rawContent?.trim() ?? '';
  if (!trimmed) return '';
  if (typeof DOMParser === 'undefined') return trimmed;

  try {
    if (trimmed.includes('<pattern')) {
      const doc = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${trimmed}</svg>`,
        'image/svg+xml'
      );
      const patternNode = doc.querySelector('pattern');
      if (patternNode) {
        return patternNode.innerHTML.trim();
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

export const buildPatternPreviewSvg = (
  pattern: PatternDef,
  previewSize = 80,
  previewPatternId = 'preview-pattern'
): string => {
  const geometry = resolvePatternTileGeometry(pattern);
  const viewBoxAttr = geometry.viewBox ? ` viewBox="${geometry.viewBox}"` : '';

  if (pattern.type === 'raw') {
    const transformAttr = pattern.patternTransform ? ` patternTransform="${pattern.patternTransform}"` : '';
    const raw = normalizeRawPatternContent(pattern.rawContent);
    const content = raw || `<rect width="${geometry.contentWidth}" height="${geometry.contentHeight}" fill="${pattern.bg}" />`;

    return `<svg viewBox="0 0 ${previewSize} ${previewSize}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="${previewPatternId}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}${transformAttr}>
      ${content}
    </pattern>
  </defs>
  <rect width="${previewSize}" height="${previewSize}" fill="url(#${previewPatternId})"/>
</svg>`;
  }

  const { content, patternTransform } = buildBuiltInPatternBody(
    pattern.type as BuiltInPatternType,
    pattern.size,
    pattern.fg,
    pattern.bg
  );
  const transformAttr = patternTransform ? ` patternTransform="${patternTransform}"` : '';

  return `<svg viewBox="0 0 ${previewSize} ${previewSize}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="${previewPatternId}" patternUnits="${geometry.units}" width="${geometry.tileWidth}" height="${geometry.tileHeight}"${viewBoxAttr}${transformAttr}>
      ${content}
    </pattern>
  </defs>
  <rect width="${previewSize}" height="${previewSize}" fill="url(#${previewPatternId})"/>
</svg>`;
};
