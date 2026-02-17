import type { PathData, PresentationAttributes } from '../../types';
import { applyInheritedStyleAttributes } from './styleAttributes';
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

  const elementTransform = parseTransform(element.getAttribute('transform') || '');
  const combinedTransform: Matrix = { ...parentTransform };
  multiplyMatrices(combinedTransform, elementTransform);

  const tagName = element.tagName.toLowerCase();

  applyInheritedStyleAttributes(element, context.inheritedStyle);

  if (tagName === 'rect') {
    normalizeRectPercentageLengths(element, context);
  }

  if (tagName === 'svg' && tryHandleEmbeddedSvg({ element, context, combinedTransform, pushResult })) {
    return results;
  }

  if (tagName === 'text') {
    applyGlobalTextDefaults(element, context);
  }

  const pluginImported = processPluginStage({
    element,
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
    element,
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
    element,
    tagName,
    combinedTransform,
    context,
  });
  if (pathElement) {
    pushResult(pathElement);
  }

  return results;
}
