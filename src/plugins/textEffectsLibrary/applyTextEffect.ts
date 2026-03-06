import type { SVGAnimation } from '../animationSystem/types';
import type { ImportedAnimationPayload } from '../../utils/importMergeUtils';
import { pluginManager } from '../../utils/pluginManager';

export interface ExtractedTextEffectStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  maskId?: string;
  clipPathId?: string;
}

export interface ExtractedTextEffectApplication {
  style: ExtractedTextEffectStyle | null;
  animations: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>;
  baseAnimations: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>;
  renderLayers: ExtractedTextEffectRenderLayer[];
  imports: Record<string, unknown[]>;
  filterPrimitives?: Array<{ type: string; [key: string]: unknown }>;
  filterAttributes?: Record<string, string>;
}

export interface ExtractedTextEffectRenderLayer {
  renderBeforeBase: boolean;
  offsetX: number;
  offsetY: number;
  style: ExtractedTextEffectStyle | null;
  animations: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>;
  filterPrimitives?: Array<{ type: string; [key: string]: unknown }>;
  filterAttributes?: Record<string, string>;
}

const URL_ID_PATTERN = /^url\(#([^)]+)\)$/;
const URL_ID_GLOBAL_PATTERN = /url\(#([^)]+)\)/g;
const TEXT_EFFECT_ANIMATION_ID_PREFIX = 'textfx-anim';
const SUPPORTED_PREVIEW_IMPORT_KEYS = new Set(['gradients', 'pattern', 'mask', 'clip', 'animation']);

type SvgAnimationElement = SVGAnimation['type'];
type FilterPrimitiveLike = { type: string; [key: string]: unknown };
type ParsedFilterDefinition = {
  primitives: FilterPrimitiveLike[];
  filterAttributes?: Record<string, string>;
};
type PreviewTextLayer = {
  element: Element;
  index: number;
  x: number;
  y: number;
  style: ExtractedTextEffectStyle | null;
  directAnimations: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>;
  fill?: string;
  rawFill: string | null;
  stroke?: string;
  rawStroke: string | null;
  opacity: number;
  maskId?: string;
  clipPathId?: string;
  filterId?: string;
  hasMask: boolean;
  hasClipPath: boolean;
  hasFilter: boolean;
};

const parseStyleAttribute = (element: Element): Map<string, string> => {
  const style = element.getAttribute('style');
  const result = new Map<string, string>();
  if (!style) return result;

  style
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex < 0) return;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (key) {
        result.set(key, value);
      }
    });

  return result;
};

const getAttributeOrStyle = (element: Element, attribute: string): string | null => {
  const attrValue = element.getAttribute(attribute);
  if (attrValue !== null) return attrValue;
  return parseStyleAttribute(element).get(attribute) ?? null;
};

const getAttributeOrStyleFromChain = (element: Element, attribute: string): string | null => {
  let current: Element | null = element;
  while (current) {
    const value = getAttributeOrStyle(current, attribute);
    if (value !== null) return value;
    current = current.parentElement;
  }
  return null;
};

const parseNumericValue = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseRepeatCount = (value: string | null): number | 'indefinite' | undefined => {
  if (!value) return undefined;
  if (value === 'indefinite') return 'indefinite';
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseRotate = (value: string | null): number | 'auto' | 'auto-reverse' | undefined => {
  if (!value) return undefined;
  if (value === 'auto' || value === 'auto-reverse') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseColor = (value: string): { r: number; g: number; b: number; a: number } | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'transparent') return null;

  if (normalized === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (normalized === 'black') return { r: 0, g: 0, b: 0, a: 1 };

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split('');
      return {
        r: Number.parseInt(`${r}${r}`, 16),
        g: Number.parseInt(`${g}${g}`, 16),
        b: Number.parseInt(`${b}${b}`, 16),
        a: a ? Number.parseInt(`${a}${a}`, 16) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1]?.split(',').map((part) => part.trim()) ?? [];
  if (parts.length < 3) return null;

  const [r, g, b, a] = parts.map(Number.parseFloat);
  if (![r, g, b].every(Number.isFinite)) return null;

  return {
    r,
    g,
    b,
    a: Number.isFinite(a) ? a : 1,
  };
};

const getColorScore = (value: string): number => {
  const rgb = parseColor(value);
  if (!rgb) {
    return value.trim().toLowerCase() === 'white' ? 0 : 1;
  }

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const alpha = rgb.a ?? 1;
  return saturation * 100 + alpha;
};

const isWhiteLikeColor = (value: string | undefined): boolean => {
  if (!value || value === 'none') return false;
  const rgb = parseColor(value);
  if (!rgb) return value.trim().toLowerCase() === 'white';
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const average = (rgb.r + rgb.g + rgb.b) / 3;
  return average >= 235 && max - min <= 24;
};

const pickRepresentativeColor = (colors: string[]): string | undefined => {
  if (!colors.length) return undefined;
  return [...colors].sort((a, b) => getColorScore(b) - getColorScore(a))[0];
};

const resolvePaintFromDefinition = (
  definition: Element,
  doc: Document,
  visited: Set<string>,
): string | undefined => {
  const tagName = definition.tagName.toLowerCase();

  if (tagName === 'lineargradient' || tagName === 'radialgradient') {
    const stopColors = Array.from(definition.querySelectorAll('stop'))
      .map((stop) => getAttributeOrStyle(stop, 'stop-color'))
      .filter((color): color is string => Boolean(color));
    return pickRepresentativeColor(stopColors);
  }

  if (tagName === 'pattern') {
    const paintCandidates = Array.from(definition.querySelectorAll('*'))
      .flatMap((node) => [
        getAttributeOrStyle(node, 'fill'),
        getAttributeOrStyle(node, 'stroke'),
      ])
      .filter((color): color is string => Boolean(color) && color !== 'none')
      .map((color) => resolvePaint(color, doc, visited) ?? color);
    return pickRepresentativeColor(paintCandidates);
  }

  return undefined;
};

const resolvePaint = (value: string | null, doc: Document, visited: Set<string> = new Set()): string | undefined => {
  if (!value) return undefined;
  if (value === 'none') return 'none';

  const urlMatch = value.match(URL_ID_PATTERN);
  if (!urlMatch) return value;

  const id = urlMatch[1];
  if (!id || visited.has(id)) return undefined;
  visited.add(id);

  const definition = doc.getElementById(id);
  if (!definition) return undefined;
  return resolvePaintFromDefinition(definition, doc, visited);
};

const normalizePaintValue = (value: string | null, doc: Document): string | undefined => {
  if (!value) return undefined;
  if (value === 'none') return 'none';

  const urlMatch = value.match(URL_ID_PATTERN);
  if (!urlMatch) return value;

  return doc.getElementById(urlMatch[1] ?? '') ? value : resolvePaint(value, doc);
};

const extractUrlId = (value: string | null): string | undefined => {
  const match = value?.match(URL_ID_PATTERN);
  return match?.[1] ?? undefined;
};

const getPaintDefinitionBonus = (rawValue: string | null, doc: Document): number => {
  const definitionId = extractUrlId(rawValue);
  if (!definitionId) return 0;

  const definition = doc.getElementById(definitionId);
  if (!definition) return 0;

  const tagName = definition.tagName.toLowerCase();
  if (tagName === 'lineargradient' || tagName === 'radialgradient') return 140;
  if (tagName === 'pattern') return 120;
  return 40;
};

const isVisiblePreviewText = (element: Element): boolean => !element.closest('defs');

const getDirectAnimationChildren = (element: Element): Element[] =>
  Array.from(element.children).filter((child) =>
    child.tagName === 'animate' ||
    child.tagName === 'animateTransform' ||
    child.tagName === 'animateMotion' ||
    child.tagName === 'set'
  );

const extractStyleFromTextNode = (element: Element, doc: Document): ExtractedTextEffectStyle | null => {
  const fill = normalizePaintValue(getAttributeOrStyleFromChain(element, 'fill'), doc);
  const stroke = normalizePaintValue(getAttributeOrStyleFromChain(element, 'stroke'), doc);
  const fillOpacity = parseNumericValue(getAttributeOrStyleFromChain(element, 'fill-opacity'));
  const strokeWidth = parseNumericValue(getAttributeOrStyleFromChain(element, 'stroke-width'));
  const strokeOpacity = parseNumericValue(getAttributeOrStyleFromChain(element, 'stroke-opacity'));
  const opacity = parseNumericValue(getAttributeOrStyleFromChain(element, 'opacity'));
  const maskId = extractUrlId(getAttributeOrStyleFromChain(element, 'mask'));
  const clipPathId = extractUrlId(getAttributeOrStyleFromChain(element, 'clip-path'));

  const style: ExtractedTextEffectStyle = {
    ...(fill !== undefined ? { fillColor: fill } : {}),
    ...(fillOpacity !== undefined ? { fillOpacity } : {}),
    ...(stroke !== undefined ? { strokeColor: stroke } : {}),
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(strokeOpacity !== undefined ? { strokeOpacity } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(maskId ? { maskId } : {}),
    ...(clipPathId ? { clipPathId } : {}),
  };

  return Object.keys(style).length > 0 ? style : null;
};

const buildPreviewTextLayer = (element: Element, doc: Document, index: number): PreviewTextLayer => {
  const rawFill = getAttributeOrStyleFromChain(element, 'fill');
  const rawStroke = getAttributeOrStyleFromChain(element, 'stroke');
  const fill = normalizePaintValue(rawFill, doc);
  const stroke = normalizePaintValue(rawStroke, doc);
  const x = parseNumericValue(getAttributeOrStyle(element, 'x')) ?? 0;
  const y = parseNumericValue(getAttributeOrStyle(element, 'y')) ?? 0;
  const opacity = parseNumericValue(getAttributeOrStyleFromChain(element, 'opacity')) ?? 1;
  const maskId = extractUrlId(getAttributeOrStyleFromChain(element, 'mask'));
  const clipPathId = extractUrlId(getAttributeOrStyleFromChain(element, 'clip-path'));
  const filterId = extractUrlId(getAttributeOrStyleFromChain(element, 'filter'));

  return {
    element,
    index,
    x,
    y,
    style: extractStyleFromTextNode(element, doc),
    directAnimations: getDirectAnimationChildren(element)
      .map(extractAnimation)
      .filter((animation): animation is Omit<SVGAnimation, 'id' | 'targetElementId'> => Boolean(animation)),
    fill,
    rawFill,
    stroke,
    rawStroke,
    opacity,
    maskId,
    clipPathId,
    filterId,
    hasMask: Boolean(maskId),
    hasClipPath: Boolean(clipPathId),
    hasFilter: Boolean(filterId),
  };
};

const scorePaintLayer = (layer: PreviewTextLayer, doc: Document): number => {
  let score = layer.index * 0.001;

  if (layer.fill && layer.fill !== 'none') {
    score += 40 + getColorScore(layer.fill);
  }
  if (layer.stroke && layer.stroke !== 'none') {
    score += 10 + getColorScore(layer.stroke) * 0.25;
  }

  score += getPaintDefinitionBonus(layer.rawFill, doc);
  score += getPaintDefinitionBonus(layer.rawStroke, doc) * 0.5;

  if (isWhiteLikeColor(layer.fill) && !extractUrlId(layer.rawFill)) {
    score -= 55;
  }
  if (isWhiteLikeColor(layer.stroke) && !extractUrlId(layer.rawStroke)) {
    score -= 10;
  }

  if (layer.hasMask) score -= 22;
  if (layer.hasClipPath) score -= 18;
  if (layer.opacity < 0.25) {
    score -= 25;
  } else {
    score += layer.opacity * 8;
  }
  if (layer.directAnimations.length > 0) {
    score -= Math.min(10, layer.directAnimations.length * 3);
  }
  if (layer.hasFilter) score += 2;

  return score;
};

const hasMeaningfulBasePaint = (layer: PreviewTextLayer): boolean => {
  if (layer.opacity < 0.2) return false;

  const hasMeaningfulFill = Boolean(
    layer.fill &&
    layer.fill !== 'none' &&
    (!isWhiteLikeColor(layer.fill) || extractUrlId(layer.rawFill))
  );
  const hasMeaningfulStroke = Boolean(
    layer.stroke &&
    layer.stroke !== 'none' &&
    (!isWhiteLikeColor(layer.stroke) || extractUrlId(layer.rawStroke))
  );

  return hasMeaningfulFill || hasMeaningfulStroke;
};

const scoreFilterCarrierLayer = (layer: PreviewTextLayer, doc: Document, filter: ParsedFilterDefinition | null): number => {
  if (!layer.filterId || !filter) return Number.NEGATIVE_INFINITY;

  let score = layer.index * 0.001;
  score += layer.opacity * 10;
  score += layer.directAnimations.length * 4;
  score += scorePaintLayer(layer, doc) * 0.05;
  if (layer.hasMask) score -= 4;
  if (layer.hasClipPath) score -= 4;
  if (filter.primitives.some((primitive) => Array.isArray(primitive.animateChildren) && primitive.animateChildren.length > 0)) {
    score += 40;
  }

  return score;
};

const extractAnimation = (element: Element): Omit<SVGAnimation, 'id' | 'targetElementId'> | null => {
  const type = element.tagName as SvgAnimationElement;
  if (type !== 'animate' && type !== 'animateTransform' && type !== 'animateMotion' && type !== 'set') {
    return null;
  }

  return {
    type,
    attributeName: getAttributeOrStyle(element, 'attributeName') ?? undefined,
    from: getAttributeOrStyle(element, 'from') ?? undefined,
    to: getAttributeOrStyle(element, 'to') ?? undefined,
    values: getAttributeOrStyle(element, 'values') ?? undefined,
    dur: getAttributeOrStyle(element, 'dur') ?? undefined,
    begin: getAttributeOrStyle(element, 'begin') ?? undefined,
    end: getAttributeOrStyle(element, 'end') ?? undefined,
    fill: (getAttributeOrStyle(element, 'fill') as SVGAnimation['fill'] | null) ?? undefined,
    repeatCount: parseRepeatCount(getAttributeOrStyle(element, 'repeatCount')),
    repeatDur: getAttributeOrStyle(element, 'repeatDur') ?? undefined,
    calcMode: (getAttributeOrStyle(element, 'calcMode') as SVGAnimation['calcMode'] | null) ?? undefined,
    keyTimes: getAttributeOrStyle(element, 'keyTimes') ?? undefined,
    keySplines: getAttributeOrStyle(element, 'keySplines') ?? undefined,
    transformType: type === 'animateTransform'
      ? (getAttributeOrStyle(element, 'type') as SVGAnimation['transformType'] | null) ?? undefined
      : undefined,
    additive: (getAttributeOrStyle(element, 'additive') as SVGAnimation['additive'] | null) ?? undefined,
    accumulate: (getAttributeOrStyle(element, 'accumulate') as SVGAnimation['accumulate'] | null) ?? undefined,
    path: type === 'animateMotion' ? getAttributeOrStyle(element, 'path') ?? undefined : undefined,
    mpath: type === 'animateMotion'
      ? element.querySelector('mpath')?.getAttribute('href')?.replace(/^#/, '') ?? undefined
      : undefined,
    rotate: type === 'animateMotion' ? parseRotate(getAttributeOrStyle(element, 'rotate')) : undefined,
    keyPoints: type === 'animateMotion' ? getAttributeOrStyle(element, 'keyPoints') ?? undefined : undefined,
  };
};

const sanitizePreviewNamespace = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'textfx-preview';

const replaceIdReferences = (value: string, idMap: Map<string, string>): string => {
  let nextValue = value.replace(URL_ID_GLOBAL_PATTERN, (match, id: string) => {
    const mappedId = idMap.get(id);
    return mappedId ? `url(#${mappedId})` : match;
  });

  const hashMatch = nextValue.match(/^#(.+)$/);
  if (hashMatch) {
    const mappedId = idMap.get(hashMatch[1] ?? '');
    if (mappedId) {
      nextValue = `#${mappedId}`;
    }
  }

  return nextValue;
};

const ensureStableAnimationTargetIds = (doc: Document, previewNamespace: string): void => {
  const animationTargets = new Map<Element, string>();
  let counter = 0;

  doc.querySelectorAll('animate, animateTransform, animateMotion, set').forEach((animationElement) => {
    const parent = animationElement.parentElement;
    if (!parent || parent.getAttribute('id')) return;

    let targetId = animationTargets.get(parent);
    if (!targetId) {
      counter += 1;
      targetId = `${previewNamespace}-animtarget-${counter}`;
      animationTargets.set(parent, targetId);
    }

    parent.setAttribute('id', targetId);
  });
};

const namespacePreviewDocument = (previewSvg: string, previewNamespace: string): Document => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(previewSvg, 'image/svg+xml');
  const idMap = new Map<string, string>();
  const namespacedPrefix = `textfx-${sanitizePreviewNamespace(previewNamespace)}`;

  Array.from(doc.querySelectorAll('[id]')).forEach((node) => {
    const id = node.getAttribute('id');
    if (!id) return;
    idMap.set(id, `${namespacedPrefix}-${id}`);
  });

  Array.from(doc.querySelectorAll('[id]')).forEach((node) => {
    const id = node.getAttribute('id');
    const namespacedId = id ? idMap.get(id) : null;
    if (namespacedId) {
      node.setAttribute('id', namespacedId);
    }
  });

  Array.from(doc.querySelectorAll('*')).forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name === 'id') return;
      const nextValue = replaceIdReferences(attr.value, idMap);
      if (nextValue !== attr.value) {
        node.setAttribute(attr.name, nextValue);
      }
    });
  });

  ensureStableAnimationTargetIds(doc, namespacedPrefix);

  return doc;
};

const extractPreviewImports = (doc: Document): Record<string, unknown[]> => {
  const imports: Record<string, unknown[]> = {};

  pluginManager.getImportDefHandlers().forEach((handler) => {
    const result = handler(doc);
    if (!result) return;

    Object.entries(result).forEach(([key, value]) => {
      if (!SUPPORTED_PREVIEW_IMPORT_KEYS.has(key)) return;

      if (key === 'animation') {
        const defAnimations = (value as ImportedAnimationPayload[]).filter((animation) =>
          Boolean(animation.gradientId || animation.patternId || animation.maskId || animation.clipPathId)
        );
        if (defAnimations.length === 0) return;
        imports.animation = [...(imports.animation ?? []), ...defAnimations];
        return;
      }

      imports[key] = [...(imports[key] ?? []), ...(value as unknown[])];
    });
  });

  return imports;
};

const parseFilterElement = (filterEl: Element | null): ParsedFilterDefinition | null => {
  if (!filterEl) return null;

  const primitives: FilterPrimitiveLike[] = [];

  Array.from(filterEl.children).forEach((child) => {
    const primitive: FilterPrimitiveLike = { type: child.tagName };

    Array.from(child.attributes).forEach((attr) => {
      if (attr.name === 'type') {
        if (child.tagName === 'feTurbulence') {
          primitive.turbulenceType = attr.value;
          return;
        }
        if (child.tagName === 'feColorMatrix') {
          primitive.matrixType = attr.value;
          return;
        }
      }
      primitive[attr.name] = attr.value;
    });

    if (child.tagName === 'feMerge') {
      primitive.feMergeNodes = Array.from(child.querySelectorAll('feMergeNode')).map((node) => ({
        in: node.getAttribute('in') || 'SourceGraphic',
      }));
    }

    if (child.tagName === 'feSpecularLighting' || child.tagName === 'feDiffuseLighting') {
      const lightSource = child.querySelector('feDistantLight, fePointLight, feSpotLight');
      if (lightSource) {
        const lightSourceData: Record<string, unknown> = { type: lightSource.tagName };
        Array.from(lightSource.attributes).forEach((attr) => {
          lightSourceData[attr.name] = attr.value;
        });
        primitive.lightSource = lightSourceData;
      }
    }

    if (child.tagName === 'feComponentTransfer') {
      Array.from(child.children).forEach((func) => {
        const funcData: Record<string, string> = {};
        Array.from(func.attributes).forEach((attr) => {
          funcData[attr.name === 'type' ? 'funcType' : attr.name] = attr.value;
        });
        primitive[func.tagName] = funcData;
      });
    }

    const animChildren: Array<Record<string, unknown>> = [];
    Array.from(child.children).forEach((sub) => {
      if (sub.tagName === 'animate' || sub.tagName === 'animateTransform') {
        const animData: Record<string, unknown> = { element: sub.tagName };
        Array.from(sub.attributes).forEach((attr) => {
          animData[attr.name] = attr.value;
        });
        animChildren.push(animData);
      }
    });
    if (animChildren.length > 0) {
      primitive.animateChildren = animChildren;
    }

    primitives.push(primitive);
  });

  const filterAttributes = ['x', 'y', 'width', 'height'].reduce<Record<string, string>>((acc, attr) => {
    const value = filterEl.getAttribute(attr);
    if (value) {
      acc[attr] = value;
    }
    return acc;
  }, {});

  return {
    primitives,
    filterAttributes: Object.keys(filterAttributes).length > 0 ? filterAttributes : undefined,
  };
};

export function parseFilterContent(filterContent: string): Array<{ type: string; [key: string]: unknown }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg"><filter>${filterContent}</filter></svg>`,
    'image/svg+xml',
  );
  return parseFilterElement(doc.querySelector('filter'))?.primitives ?? [];
}

export const buildTextEffectAnimationId = (elementId: string, presetId: string, index: number): string =>
  `${TEXT_EFFECT_ANIMATION_ID_PREFIX}-${elementId}-${presetId}-${index}`;

export const isTextEffectAnimationId = (id: string): boolean =>
  id.startsWith(TEXT_EFFECT_ANIMATION_ID_PREFIX);

export const extractTextEffectApplicationFromPreview = (
  previewSvg: string,
  previewNamespace: string,
): ExtractedTextEffectApplication => {
  const doc = namespacePreviewDocument(previewSvg, previewNamespace);
  const imports = extractPreviewImports(doc);
  const textNodes = Array.from(doc.querySelectorAll('text')).filter(isVisiblePreviewText);

  if (textNodes.length === 0) {
    return {
      style: null,
      animations: [],
      baseAnimations: [],
      renderLayers: [],
      imports,
    };
  }

  const layers = textNodes.map((node, index) => buildPreviewTextLayer(node, doc, index));
  const paintLayer = [...layers].sort((a, b) => scorePaintLayer(b, doc) - scorePaintLayer(a, doc))[0];
  const unmaskedLayers = layers.filter((layer) => !layer.hasMask && !layer.hasClipPath);
  const coverageLayers = layers.filter((layer) => layer.hasMask || layer.hasClipPath);
  const hasMeaningfulUnmaskedBase = unmaskedLayers.some(hasMeaningfulBasePaint);
  const canTransferCoverageEffects = coverageLayers.length === 1 && !hasMeaningfulUnmaskedBase;
  const singleAnimatedLayer = layers.filter((layer) => layer.directAnimations.length > 0);
  const previewFilterCandidates = layers
    .map((layer) => ({
      layer,
      filter: parseFilterElement(layer.filterId ? doc.getElementById(layer.filterId) : null),
    }))
    .filter((entry): entry is { layer: PreviewTextLayer; filter: ParsedFilterDefinition } => Boolean(entry.filter));
  const bestPreviewFilter = [...previewFilterCandidates].sort(
    (a, b) => scoreFilterCarrierLayer(b.layer, doc, b.filter) - scoreFilterCarrierLayer(a.layer, doc, a.filter),
  )[0];

  const baseStyle = paintLayer?.style;
  const paintLayerX = paintLayer?.x ?? 0;
  const paintLayerY = paintLayer?.y ?? 0;
  const preserveExistingFill =
    !hasMeaningfulUnmaskedBase &&
    Boolean(paintLayer?.hasMask || paintLayer?.hasClipPath) &&
    isWhiteLikeColor(paintLayer?.fill) &&
    !extractUrlId(paintLayer?.rawFill ?? null);
  const finalStyle: ExtractedTextEffectStyle = {
    ...(!preserveExistingFill && baseStyle?.fillColor !== undefined ? { fillColor: baseStyle.fillColor } : {}),
    ...(baseStyle?.fillOpacity !== undefined ? { fillOpacity: baseStyle.fillOpacity } : {}),
    ...(baseStyle?.strokeColor !== undefined ? { strokeColor: baseStyle.strokeColor } : {}),
    ...(baseStyle?.strokeWidth !== undefined ? { strokeWidth: baseStyle.strokeWidth } : {}),
    ...(baseStyle?.strokeOpacity !== undefined ? { strokeOpacity: baseStyle.strokeOpacity } : {}),
  };

  if (baseStyle && (!paintLayer?.hasMask && !paintLayer?.hasClipPath)) {
    if (baseStyle.opacity !== undefined) {
      finalStyle.opacity = baseStyle.opacity;
    }
  }

  if (canTransferCoverageEffects) {
    const coverageStyle = coverageLayers[0]?.style;
    if (coverageStyle?.maskId) finalStyle.maskId = coverageStyle.maskId;
    if (coverageStyle?.clipPathId) finalStyle.clipPathId = coverageStyle.clipPathId;
    if (finalStyle.opacity === undefined && coverageStyle?.opacity !== undefined) {
      finalStyle.opacity = coverageStyle.opacity;
    }
  }

  const shouldApplyDirectAnimations =
    singleAnimatedLayer.length === 1 &&
    (!singleAnimatedLayer[0]?.hasMask && !singleAnimatedLayer[0]?.hasClipPath || !hasMeaningfulUnmaskedBase);
  const renderLayers = layers
    .filter((layer) => layer !== paintLayer)
    .map((layer): ExtractedTextEffectRenderLayer => {
      const layerFilter = parseFilterElement(layer.filterId ? doc.getElementById(layer.filterId) : null);
      return {
        renderBeforeBase: layer.index < (paintLayer?.index ?? 0),
        offsetX: layer.x - paintLayerX,
        offsetY: layer.y - paintLayerY,
        style: layer.style,
        animations: layer.directAnimations,
        ...(layerFilter ? {
          filterPrimitives: layerFilter.primitives,
          filterAttributes: layerFilter.filterAttributes,
        } : {}),
      };
    });

  const style = Object.keys(finalStyle).length > 0 ? finalStyle : null;

  return {
    style,
    animations: shouldApplyDirectAnimations ? singleAnimatedLayer[0]?.directAnimations ?? [] : [],
    baseAnimations: paintLayer?.directAnimations ?? [],
    renderLayers,
    imports,
    ...(bestPreviewFilter ? {
      filterPrimitives: bestPreviewFilter.filter.primitives,
      filterAttributes: bestPreviewFilter.filter.filterAttributes,
    } : {}),
  };
};
