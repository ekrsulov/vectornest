import type { GroupData } from '../../types';
import { extractStyleAttributes } from './styleAttributes';
import { multiplyMatrices } from './transform';
import type { Matrix } from './transform';
import type { ImportedElement } from './importTypes';
import type { ImportContext, TextPathAttachment } from './processElementTypes';
import {
  createIdentityMatrix,
  createSyntheticSourceId,
  sanitizeDisplayStyleAttributes,
  toMatrixTuple,
} from './processElementCommon';

type ProcessElementFn = (
  element: Element,
  parentTransform?: Matrix,
  attachments?: TextPathAttachment[],
  context?: ImportContext
) => ImportedElement[];

type PushResult = (element: ImportedElement) => void;

type SpecialTagArgs = {
  element: Element;
  tagName: string;
  combinedTransform: Matrix;
  elementTransform: Matrix;
  attachments: TextPathAttachment[];
  context: ImportContext;
  recurse: ProcessElementFn;
  pushResult: PushResult;
};

const sanitizeForeignObjectContent = (node: Element): string => {
  const clone = node.cloneNode(true) as Element;
  clone.querySelectorAll('script').forEach((s) => s.remove());

  const cleanAttrs = (target: Element): void => {
    Array.from(target.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        target.removeAttribute(attr.name);
        return;
      }
      if (
        (name === 'href' || name === 'xlink:href' || name === 'src') &&
        value.startsWith('javascript:')
      ) {
        target.removeAttribute(attr.name);
        return;
      }
      if (
        name === 'style' &&
        (value.includes('expression(') || value.includes('javascript:'))
      ) {
        target.removeAttribute(attr.name);
      }
    });
    Array.from(target.children).forEach((child) => cleanAttrs(child as Element));
  };

  cleanAttrs(clone);

  const serializer = new XMLSerializer();
  const serializedChildren = Array.from(clone.childNodes)
    .map((n) => serializer.serializeToString(n))
    .join('');
  const hasXhtmlNamespace =
    serializedChildren.includes('xmlns="http://www.w3.org/1999/xhtml"') ||
    serializedChildren.includes("xmlns='http://www.w3.org/1999/xhtml'");

  if (!hasXhtmlNamespace) {
    return `<div xmlns="http://www.w3.org/1999/xhtml">${serializedChildren}</div>`;
  }

  return serializedChildren;
};

const stripSourceIds = (elements: ImportedElement[]): ImportedElement[] => {
  return elements.map((el) => {
    if (el.type === 'group') {
      return {
        ...el,
        data: { ...(el.data ?? {}), sourceId: undefined },
        children: stripSourceIds(el.children),
      };
    }

    if (
      el.type === 'path' ||
      el.type === 'foreignObject' ||
      el.type === 'embeddedSvg' ||
      el.type === 'nativeShape' ||
      el.type === 'nativeText' ||
      el.type === 'image' ||
      el.type === 'symbolInstance' ||
      el.type === 'use'
    ) {
      return {
        ...el,
        data: {
          ...(el.data as Record<string, unknown>),
          sourceId: undefined,
        } as typeof el.data,
      } as ImportedElement;
    }

    return el;
  });
};

export const handleSpecialElementTags = ({
  element,
  tagName,
  combinedTransform,
  elementTransform,
  attachments,
  context,
  recurse,
  pushResult,
}: SpecialTagArgs): boolean => {
  if (tagName === 'foreignobject') {
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const width = parseFloat(element.getAttribute('width') || '0');
    const height = parseFloat(element.getAttribute('height') || '0');
    const styleAttrs = extractStyleAttributes(element, context.inheritedStyle);
    const { hasDisplayNone, sanitizedStyleAttrs } = sanitizeDisplayStyleAttributes(styleAttrs);

    pushResult({
      type: 'foreignObject',
      data: {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        width: Number.isFinite(width) ? width : 0,
        height: Number.isFinite(height) ? height : 0,
        innerHtml: sanitizeForeignObjectContent(element),
        overflow: element.getAttribute('overflow') || undefined,
        requiredExtensions: element.getAttribute('requiredExtensions') || undefined,
        transformMatrix: toMatrixTuple(combinedTransform),
        ...(sanitizedStyleAttrs as Record<string, unknown>),
        ...(hasDisplayNone ? { importedHidden: true } : {}),
        sourceId: element.getAttribute('id') ?? undefined,
      },
    });
    return true;
  }

  if (tagName === 'defs') {
    Array.from(element.children).forEach((child) => {
      recurse(child, createIdentityMatrix(), attachments, {
        ...context,
        inDefs: true,
        cumulativeTransform: context.cumulativeTransform ?? createIdentityMatrix(),
        hiddenAncestor: context.hiddenAncestor,
      }).forEach(pushResult);
    });
    return true;
  }

  if (tagName === 'g') {
    const styleAttrs = extractStyleAttributes(element, context.inheritedStyle);
    const inheritedHidden = context.hiddenAncestor ?? false;
    const { hasDisplayNone, sanitizedStyleAttrs } = sanitizeDisplayStyleAttributes(styleAttrs);
    const effectiveHidden = inheritedHidden || hasDisplayNone;

    const cumulative = context.cumulativeTransform
      ? { ...context.cumulativeTransform }
      : createIdentityMatrix();
    multiplyMatrices(cumulative, elementTransform);

    const groupSourceId = element.getAttribute('id') ?? createSyntheticSourceId('group');
    const ancestorGroupSourceIds = [...(context.ancestorGroupSourceIds ?? []), groupSourceId];

    const groupHasAnimateTransform = element.querySelector('animateTransform') !== null;
    const effectiveAnimatedAncestor = context.hasAnimatedAncestor || groupHasAnimateTransform;

    const groupChildren: ImportedElement[] = [];
    Array.from(element.children).forEach((child) => {
      groupChildren.push(
        ...recurse(child, createIdentityMatrix(), attachments, {
          ...context,
          inheritedStyle: sanitizedStyleAttrs,
          cumulativeTransform: cumulative,
          ancestorGroupSourceIds,
          hiddenAncestor: effectiveHidden,
          hasAnimatedAncestor: effectiveAnimatedAncestor,
        })
      );
    });

    if (groupChildren.length === 0) {
      return true;
    }

    const filterId = (styleAttrs as { filterId?: string }).filterId;
    const groupData = {
      ...sanitizedStyleAttrs,
      filterId,
      transformMatrix: toMatrixTuple(combinedTransform),
      sourceId: groupSourceId,
      isHidden: effectiveHidden || (styleAttrs as Partial<GroupData>)?.isHidden || false,
      ...(groupHasAnimateTransform ? { hasAnimatedTransform: true } : {}),
    };

    const groupNameAttr =
      element.getAttribute('id') ||
      element.getAttribute('data-name') ||
      element.getAttribute('inkscape:label') ||
      element.getAttribute('sodipodi:label') ||
      undefined;

    pushResult({
      type: 'group',
      name: groupNameAttr || undefined,
      data: groupData,
      children: groupChildren,
    });

    return true;
  }

  if (tagName === 'switch') {
    const children = Array.from(element.children);
    let selectedChild: Element | null = null;

    for (const child of children) {
      const requiredFeatures = child.getAttribute('requiredFeatures');
      const requiredExtensions = child.getAttribute('requiredExtensions');
      const systemLanguage = child.getAttribute('systemLanguage');

      const hasNoRequirements = !requiredFeatures && !requiredExtensions && !systemLanguage;
      const supportsXhtml = requiredExtensions === 'http://www.w3.org/1999/xhtml';
      const supportsGradients = requiredFeatures?.includes('Gradient');

      if (hasNoRequirements || supportsXhtml || supportsGradients) {
        selectedChild = child;
        break;
      }
    }

    if (!selectedChild && children.length > 0) {
      selectedChild = children[0];
    }

    if (selectedChild) {
      recurse(selectedChild, combinedTransform, attachments, {
        ...context,
        hiddenAncestor: context.hiddenAncestor,
      }).forEach(pushResult);
    }

    return true;
  }

  if (tagName === 'a') {
    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    const target = element.getAttribute('target');

    const styleAttrs = extractStyleAttributes(element, context.inheritedStyle);
    const inheritedHidden = context.hiddenAncestor ?? false;
    const { hasDisplayNone, sanitizedStyleAttrs } = sanitizeDisplayStyleAttributes(styleAttrs);
    const effectiveHidden = inheritedHidden || hasDisplayNone;

    const cumulative = context.cumulativeTransform
      ? { ...context.cumulativeTransform }
      : createIdentityMatrix();
    multiplyMatrices(cumulative, elementTransform);

    const groupSourceId = element.getAttribute('id') ?? createSyntheticSourceId('group');
    const ancestorGroupSourceIds = [...(context.ancestorGroupSourceIds ?? []), groupSourceId];

    const anchorChildren: ImportedElement[] = [];
    Array.from(element.children).forEach((child) => {
      anchorChildren.push(
        ...recurse(child, createIdentityMatrix(), attachments, {
          ...context,
          inheritedStyle: sanitizedStyleAttrs,
          cumulativeTransform: cumulative,
          ancestorGroupSourceIds,
          hiddenAncestor: effectiveHidden,
        })
      );
    });

    if (anchorChildren.length === 0) {
      return true;
    }

    const groupData = {
      ...sanitizedStyleAttrs,
      href: href ?? undefined,
      target: target ?? undefined,
      transformMatrix: toMatrixTuple(combinedTransform),
      sourceId: groupSourceId,
      isHidden: effectiveHidden || (styleAttrs as Partial<GroupData>)?.isHidden || false,
    };

    pushResult({
      type: 'group',
      name: element.getAttribute('id') || undefined,
      data: groupData,
      children: anchorChildren,
    });

    return true;
  }

  if (tagName === 'use') {
    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    if (!href || !href.startsWith('#')) {
      return true;
    }

    const refId = href.slice(1);
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const styleAttrs = extractStyleAttributes(element, context.inheritedStyle);
    const inheritedHidden = context.hiddenAncestor ?? false;
    const { hasDisplayNone, sanitizedStyleAttrs } = sanitizeDisplayStyleAttributes(styleAttrs);
    const effectiveHidden = inheritedHidden || hasDisplayNone;

    const refEl = context.doc?.getElementById(refId);
    const useHasId = element.getAttribute('id');

    if (refEl && refEl !== element) {
      const useTransform = { ...combinedTransform };
      if (x !== 0 || y !== 0) {
        multiplyMatrices(useTransform, { a: 1, b: 0, c: 0, d: 1, e: x, f: y });
      }

      const clonedChildren = recurse(refEl, useTransform, attachments, {
        ...context,
        inheritedStyle: undefined,
        hiddenAncestor: effectiveHidden,
      });

      const cloned = stripSourceIds(clonedChildren);
      const groupSourceId = useHasId ?? createSyntheticSourceId('use');

      pushResult({
        type: 'group',
        name: useHasId ?? undefined,
        data: {
          ...sanitizedStyleAttrs,
          sourceId: groupSourceId,
          transformMatrix: [1, 0, 0, 1, 0, 0],
          isHidden: effectiveHidden,
        },
        children: cloned,
      });
      return true;
    }

    const widthAttr = element.getAttribute('width');
    const heightAttr = element.getAttribute('height');
    const width = widthAttr !== null ? parseFloat(widthAttr) : undefined;
    const height = heightAttr !== null ? parseFloat(heightAttr) : undefined;

    pushResult({
      type: 'use',
      data: {
        href: refId,
        x,
        y,
        width,
        height,
        transformMatrix: toMatrixTuple(combinedTransform),
        sourceId: useHasId ?? undefined,
        ...(sanitizedStyleAttrs as Record<string, unknown>),
        ...(hasDisplayNone ? { importedHidden: true } : {}),
      },
    });
    return true;
  }

  return false;
};
