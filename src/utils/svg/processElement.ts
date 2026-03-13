import type { PathData, PresentationAttributes } from '../../types';
import {
  collectExplicitPresentationAttributes,
  rememberExplicitPresentationAttributes,
} from '../sourcePresentationAttributes';
import { applyInheritedStyleAttributes, resolveInheritedColor } from './styleAttributes';
import { parseTransform, multiplyMatrices } from './transform';
import type { Matrix } from './transform';
import type { ImportedElement } from './importTypes';
import type { ImportContext, TextPathAttachment } from './processElementTypes';
import { createIdentityMatrix, toMatrixTuple } from './processElementCommon';
import { processPluginStage } from './processElementPluginStage';
import { handleSpecialElementTags } from './processElementSpecialTags';
import { processPathStage } from './processElementPathStage';

export type { TextPathAttachment } from './processElementTypes';

const normalizeRectPercentageLengths = (
  element: Element,
  context: ImportContext
): void => {
  const svgDims = context.svgDimensions;
  if (!svgDims) {
    return;
  }

  const toAbsolute = (
    value: string | null | undefined,
    axis: 'x' | 'y'
  ): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.endsWith('%')) return null;

    const num = parseFloat(trimmed.replace('%', ''));
    if (!Number.isFinite(num)) return null;

    const base =
      axis === 'x'
        ? (svgDims.viewBox?.width ?? svgDims.width)
        : (svgDims.viewBox?.height ?? svgDims.height);
    if (!base || !Number.isFinite(base)) return null;

    return String((num / 100) * base);
  };

  const absWidth = toAbsolute(element.getAttribute('width'), 'x');
  const absHeight = toAbsolute(element.getAttribute('height'), 'y');
  const absX = toAbsolute(element.getAttribute('x'), 'x');
  const absY = toAbsolute(element.getAttribute('y'), 'y');

  if (absWidth !== null) element.setAttribute('width', absWidth);
  if (absHeight !== null) element.setAttribute('height', absHeight);
  if (absX !== null) element.setAttribute('x', absX);
  if (absY !== null) element.setAttribute('y', absY);
};

const IMPLICIT_VIEWPORT_WIDTH_ATTR = 'data-vectornest-implicit-viewport-width';
const IMPLICIT_VIEWPORT_HEIGHT_ATTR = 'data-vectornest-implicit-viewport-height';

const copyImplicitViewportSize = (source: Element, target: Element): void => {
  let current: Element | null = source.parentElement;

  while (current) {
    const preservedWidth = parseFloat(current.getAttribute(IMPLICIT_VIEWPORT_WIDTH_ATTR) || '');
    const preservedHeight = parseFloat(current.getAttribute(IMPLICIT_VIEWPORT_HEIGHT_ATTR) || '');
    if (Number.isFinite(preservedWidth) && preservedWidth > 0 && Number.isFinite(preservedHeight) && preservedHeight > 0) {
      target.setAttribute(IMPLICIT_VIEWPORT_WIDTH_ATTR, String(preservedWidth));
      target.setAttribute(IMPLICIT_VIEWPORT_HEIGHT_ATTR, String(preservedHeight));
      return;
    }

    if (current.tagName.toLowerCase() === 'svg') {
      const viewBoxAttr = current.getAttribute('viewBox');
      if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/[\s,]+/).map(parseFloat);
        if (parts.length === 4 && Number.isFinite(parts[2]) && parts[2] > 0 && Number.isFinite(parts[3]) && parts[3] > 0) {
          target.setAttribute(IMPLICIT_VIEWPORT_WIDTH_ATTR, String(parts[2]));
          target.setAttribute(IMPLICIT_VIEWPORT_HEIGHT_ATTR, String(parts[3]));
          return;
        }
      }

      const width = parseFloat(current.getAttribute('width') || '');
      const height = parseFloat(current.getAttribute('height') || '');
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        target.setAttribute(IMPLICIT_VIEWPORT_WIDTH_ATTR, String(width));
        target.setAttribute(IMPLICIT_VIEWPORT_HEIGHT_ATTR, String(height));
        return;
      }
    }

    current = current.parentElement;
  }
};

const applyGlobalTextDefaults = (element: Element, context: ImportContext): void => {
  if (!context.textStyle) {
    return;
  }

  if (context.textStyle.fontSize !== undefined && !element.hasAttribute('font-size')) {
    element.setAttribute('font-size', String(context.textStyle.fontSize));
  }
  if (context.textStyle.fontFamily && !element.hasAttribute('font-family')) {
    element.setAttribute('font-family', context.textStyle.fontFamily);
  }
  if (context.textStyle.fontWeight && !element.hasAttribute('font-weight')) {
    element.setAttribute('font-weight', context.textStyle.fontWeight);
  }
  if (context.textStyle.fontStyle && !element.hasAttribute('font-style')) {
    element.setAttribute('font-style', context.textStyle.fontStyle);
  }
};

type EmbeddedSvgArgs = {
  element: Element;
  context: ImportContext;
  combinedTransform: Matrix;
  pushResult: (el: ImportedElement) => void;
};

const extractEmbeddedSvgRootAttributes = (element: Element): Record<string, string> | undefined => {
  const excludedAttributes = new Set([
    'id',
    'x',
    'y',
    'width',
    'height',
    'viewBox',
    'preserveAspectRatio',
    'overflow',
    'transform',
  ]);

  const rootAttributes = Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
    if (excludedAttributes.has(attr.name)) {
      return acc;
    }

    acc[attr.name] = attr.value;
    return acc;
  }, {});

  return Object.keys(rootAttributes).length > 0 ? rootAttributes : undefined;
};

const tryHandleEmbeddedSvg = ({
  element,
  context,
  combinedTransform,
  pushResult,
}: EmbeddedSvgArgs): boolean => {
  if (!context.doc) {
    return false;
  }

  const isRoot = element === context.doc.querySelector('svg');
  if (isRoot) {
    return false;
  }

  const x = parseFloat(element.getAttribute('x') || '0');
  const y = parseFloat(element.getAttribute('y') || '0');
  const width = element.getAttribute('width');
  const height = element.getAttribute('height');
  const viewBoxAttr = element.getAttribute('viewBox') || undefined;
  const preserveAspectRatio = element.getAttribute('preserveAspectRatio') || undefined;
  const overflow = element.getAttribute('overflow') || undefined;

  pushResult({
    type: 'embeddedSvg',
    data: {
      x,
      y,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      viewBox: viewBoxAttr || undefined,
      preserveAspectRatio,
      overflow,
      rootAttributes: extractEmbeddedSvgRootAttributes(element),
      innerSvg: element.innerHTML,
      transformMatrix: toMatrixTuple(combinedTransform),
      sourceId: element.getAttribute('id') ?? undefined,
    },
  });

  return true;
};

export function processElement(
  element: Element,
  parentTransform: Matrix = createIdentityMatrix(),
  attachments: TextPathAttachment[] = [],
  context: ImportContext = {}
): ImportedElement[] {
  const results: ImportedElement[] = [];
  const pushResult = (el: ImportedElement): void => {
    if (context.inDefs) {
      (el.data as PresentationAttributes).isDefinition = true;
      if (el.type === 'path') {
        (el.data as PathData).display = 'none';
        (el.data as PathData).visibility = 'hidden';
      }
    }
    results.push(el);
  };

  const sourceTagName = element.tagName.toLowerCase();
  const explicitPresentationAttributes = collectExplicitPresentationAttributes(element);
  const needsDetachedClone = Boolean(context.inheritedStyle) || sourceTagName === 'rect' || sourceTagName === 'text';
  const workingElement = needsDetachedClone ? (element.cloneNode(true) as Element) : element;
  rememberExplicitPresentationAttributes(workingElement, explicitPresentationAttributes);
  if (needsDetachedClone) {
    const inheritedColor = resolveInheritedColor(element);
    if (inheritedColor && !workingElement.hasAttribute('color')) {
      workingElement.setAttribute('color', inheritedColor);
    }
    copyImplicitViewportSize(element, workingElement);
  }
  const elementTransform = parseTransform(workingElement.getAttribute('transform') || '');
  const combinedTransform: Matrix = { ...parentTransform };
  multiplyMatrices(combinedTransform, elementTransform);

  const tagName = workingElement.tagName.toLowerCase();

  applyInheritedStyleAttributes(workingElement, context.inheritedStyle);

  if (tagName === 'rect') {
    normalizeRectPercentageLengths(workingElement, context);
  }

  if (tagName === 'svg' && tryHandleEmbeddedSvg({ element: workingElement, context, combinedTransform, pushResult })) {
    return results;
  }

  if (tagName === 'text') {
    applyGlobalTextDefaults(workingElement, context);
  }

  const pluginImported = processPluginStage({
    element: workingElement,
    tagName,
    parentTransform,
    combinedTransform,
    attachments,
    context,
  });
  if (pluginImported) {
    pluginImported.forEach(pushResult);
    return results;
  }

  const specialTagHandled = handleSpecialElementTags({
    element: workingElement,
    tagName,
    combinedTransform,
    elementTransform,
    attachments,
    context,
    recurse: processElement,
    pushResult,
  });
  if (specialTagHandled) {
    return results;
  }

  const pathElement = processPathStage({
    element: workingElement,
    tagName,
    combinedTransform,
    context,
  });
  if (pathElement) {
    pushResult(pathElement);
  }

  return results;
}
