import type { PresentationAttributes } from '../types';

const TRACKED_PRESENTATION_ATTRIBUTES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
] as const;

type TrackedPresentationAttribute = typeof TRACKED_PRESENTATION_ATTRIBUTES[number];

const EMPTY_EXPLICIT_ATTRIBUTE_SET = new Set<string>();
const explicitPresentationAttributeMap = new WeakMap<Element, Set<string>>();

const normalizeColorValue = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '#000') return '#000000';
  if (normalized === 'black') return '#000000';
  return normalized;
};

const hasInlineStyleProperty = (
  element: Element,
  property: TrackedPresentationAttribute,
): boolean => {
  const styleAttr = element.getAttribute('style');
  if (!styleAttr) {
    return false;
  }

  return styleAttr
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((declaration) => {
      const separatorIndex = declaration.indexOf(':');
      if (separatorIndex === -1) {
        return false;
      }
      return declaration.slice(0, separatorIndex).trim() === property;
    });
};

export const collectExplicitPresentationAttributes = (
  element: Element,
): string[] => TRACKED_PRESENTATION_ATTRIBUTES.filter(
  (attribute) => element.hasAttribute(attribute) || hasInlineStyleProperty(element, attribute),
);

export const rememberExplicitPresentationAttributes = (
  element: Element,
  explicitAttributes: readonly string[],
): void => {
  if (explicitAttributes.length === 0) {
    explicitPresentationAttributeMap.delete(element);
    return;
  }

  explicitPresentationAttributeMap.set(element, new Set(explicitAttributes));
};

export const getExplicitPresentationAttributes = (
  element: Element,
): ReadonlySet<string> => explicitPresentationAttributeMap.get(element) ?? EMPTY_EXPLICIT_ATTRIBUTE_SET;

export const hasExplicitSourceAttribute = (
  data: PresentationAttributes | Record<string, unknown> | undefined,
  attribute: TrackedPresentationAttribute,
): boolean => {
  const sourceExplicitAttributes = (data as { sourceExplicitAttributes?: unknown } | undefined)?.sourceExplicitAttributes;
  return Array.isArray(sourceExplicitAttributes) && sourceExplicitAttributes.includes(attribute);
};

export const shouldSerializeDefinitionPresentationAttribute = (
  data: PresentationAttributes | Record<string, unknown> | undefined,
  attribute: TrackedPresentationAttribute,
  value: string | number | undefined,
): boolean => {
  if (!(data as { isDefinition?: boolean } | undefined)?.isDefinition) {
    return true;
  }

  if (hasExplicitSourceAttribute(data, attribute)) {
    return true;
  }

  switch (attribute) {
    case 'fill':
      return typeof value !== 'string' || normalizeColorValue(value) !== '#000000';
    case 'fill-opacity':
      return typeof value !== 'number' || value !== 1;
    case 'stroke':
      return typeof value !== 'string' || normalizeColorValue(value) !== 'none';
    case 'stroke-width':
      return typeof value !== 'number' || value !== 1;
    case 'stroke-opacity':
      return typeof value !== 'number' || value !== 1;
    default:
      return true;
  }
};
