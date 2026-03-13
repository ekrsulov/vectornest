import React from 'react';
import type { CanvasElement, GroupElement, PathElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { animationContributionRegistry } from '../../utils/animationContributionRegistry';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { serializePathElement } from '../../utils/export/pathSerialization';
import { escapeXmlAttribute } from '../../utils/xmlEscapeUtils';
import {
  collectReferencedDefinitionIds,
  isDefinitionElement,
} from '../../utils/importedDefinitionUtils';

const sortByZIndex = (left: CanvasElement, right: CanvasElement): number => left.zIndex - right.zIndex;
const HREF_REFERENCE_REGEX = /\b(xlink:href|href)=("|')#([^"']+)\2/g;

const ImportedDefinitionMarkup: React.FC<{ markup: string }> = ({ markup }) => {
  const containerRef = React.useRef<SVGGElement>(null);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg"><g id="__imported_defs__">${markup}</g></svg>`,
      'image/svg+xml',
    );
    const root = doc.querySelector('#__imported_defs__');
    if (!root) {
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    Array.from(root.childNodes).forEach((node) => {
      container.appendChild(document.importNode(node, true));
    });
  }, [markup]);

  return React.createElement('g', { ref: containerRef });
};

const applyHiddenDisplay = (markup: string, isHidden: boolean): string => {
  if (!isHidden) {
    return markup;
  }

  const withoutDisplay = markup.replace(/\sdisplay="[^"]*"/g, '');
  return withoutDisplay.replace(/^(\s*<\w+)/, '$1 display="none"');
};

const getDefinitionExportId = (element: CanvasElement): string => {
  const sourceId = (element.data as { sourceId?: unknown } | undefined)?.sourceId;
  return typeof sourceId === 'string' && sourceId.trim().length > 0 ? sourceId : element.id;
};

const buildDefinitionExportIdMap = (elements: CanvasElement[]): Map<string, string> => {
  const exportIdMap = new Map<string, string>();
  elements.forEach((element) => {
    if (!isDefinitionElement(element)) {
      return;
    }
    exportIdMap.set(element.id, getDefinitionExportId(element));
  });
  return exportIdMap;
};

const buildDefinitionRuntimeIdMap = (elements: CanvasElement[]): Map<string, string> => {
  const runtimeIdMap = new Map<string, string>();
  elements.forEach((element) => {
    if (!isDefinitionElement(element)) {
      return;
    }
    runtimeIdMap.set(element.id, element.id);
  });
  return runtimeIdMap;
};

const rewriteDefinitionReferenceIds = (
  markup: string,
  exportIdMap: Map<string, string>,
): string => markup.replace(HREF_REFERENCE_REGEX, (match, attribute, quote, refId) => {
  const nextId = exportIdMap.get(refId);
  return nextId ? `${attribute}=${quote}#${nextId}${quote}` : match;
});

const serializeDefinitionLeaf = (
  element: CanvasElement,
  state: CanvasStore,
  isHidden: boolean,
  exportIdMap: Map<string, string>,
): string | null => {
  const exportId = getDefinitionExportId(element);

  if (element.type === 'path') {
    const markup = serializePathElement(element as PathElement, '', state, { includeTextPath: false });
    if (!markup) {
      return null;
    }

    const normalizedMarkup = exportId === element.id
      ? markup.trim()
      : markup.trim().replace(`id="${element.id}"`, `id="${exportId}"`);

    return applyHiddenDisplay(normalizedMarkup, isHidden);
  }

  const exportElement = exportId === element.id
    ? element
    : ({ ...element, id: exportId } as CanvasElement);
  const serialized = elementContributionRegistry.serializeElement(exportElement);
  if (!serialized) {
    return null;
  }

  const animations = rewriteDefinitionReferenceIds(
    animationContributionRegistry.serializeAnimationsForElement(state, element),
    exportIdMap,
  );
  let markup = serialized.trim();

  if (animations.length > 0) {
    const selfClosingMatch = markup.match(/^(<\w+[^>]*)\s*\/>$/);
    if (selfClosingMatch) {
      markup = `${selfClosingMatch[1]}>\n${animations}\n</${markup.match(/^<(\w+)/)?.[1] ?? 'element'}>`;
    } else {
      const closingMatch = markup.match(/^(.*)<\/(\w+)>$/s);
      if (closingMatch) {
        markup = `${closingMatch[1]}${animations}\n</${closingMatch[2]}>`;
      }
    }
  }

  return applyHiddenDisplay(markup, isHidden);
};

const serializeDefinitionTree = (
  element: CanvasElement,
  childrenByParent: Map<string, CanvasElement[]>,
  state: CanvasStore,
  exportIdMap: Map<string, string>,
): string | null => {
  const isHidden = state.isElementHidden?.(element.id) ?? Boolean((element.data as { isHidden?: boolean } | undefined)?.isHidden);
  const exportId = getDefinitionExportId(element);

  if (element.type !== 'group') {
    return serializeDefinitionLeaf(element, state, isHidden, exportIdMap);
  }

  const groupElement = element as GroupElement;
  const attributes: string[] = [`id="${exportId}"`];

  if (groupElement.data.name) {
    attributes.push(`data-name="${escapeXmlAttribute(groupElement.data.name)}"`);
  }
  if (isHidden) {
    attributes.push('display="none"');
  }
  if (groupElement.data.transformMatrix) {
    attributes.push(`transform="matrix(${groupElement.data.transformMatrix.join(' ')})"`);
  } else {
    const transform = groupElement.data.transform;
    if (
      transform &&
      (transform.translateX !== 0 ||
        transform.translateY !== 0 ||
        transform.rotation !== 0 ||
        transform.scaleX !== 1 ||
        transform.scaleY !== 1)
    ) {
      attributes.push(
        `transform="translate(${transform.translateX},${transform.translateY}) rotate(${transform.rotation}) scale(${transform.scaleX},${transform.scaleY})"`
      );
    }
  }
  if (groupElement.data.filterId) {
    attributes.push(`filter="url(#${groupElement.data.filterId})"`);
  }
  if (groupElement.data.opacity !== undefined) {
    attributes.push(`opacity="${groupElement.data.opacity}"`);
  }

  const clipRef = groupElement.data.clipPathId ?? groupElement.data.clipPathTemplateId;
  if (clipRef) {
    attributes.push(`clip-path="url(#${clipRef})"`);
  }
  if ((groupElement.data as { maskId?: string }).maskId) {
    attributes.push(`mask="url(#${(groupElement.data as { maskId?: string }).maskId})"`);
  }

  const styleParts: string[] = [];
  if (groupElement.data.mixBlendMode) {
    styleParts.push(`mix-blend-mode:${groupElement.data.mixBlendMode}`);
  }
  if (groupElement.data.isolation) {
    styleParts.push(`isolation:${groupElement.data.isolation}`);
  }
  if (styleParts.length > 0) {
    attributes.push(`style="${styleParts.join(';')}"`);
  }

  const childMarkup = (childrenByParent.get(groupElement.id) ?? [])
    .sort(sortByZIndex)
    .map((child) => serializeDefinitionTree(child, childrenByParent, state, exportIdMap))
    .filter((value): value is string => Boolean(value))
    .join('\n');

  const animations = rewriteDefinitionReferenceIds(
    animationContributionRegistry.serializeAnimationsForElement(state, groupElement),
    exportIdMap,
  );
  const contentParts = [childMarkup, animations].filter(Boolean);

  if (contentParts.length === 0) {
    return `<g ${attributes.join(' ')} />`;
  }

  return `<g ${attributes.join(' ')}>\n${contentParts.join('\n')}\n</g>`;
};

defsContributionRegistry.register({
  id: 'imported-definitions',
  collectUsedIds: (elements) => collectReferencedDefinitionIds(elements),
  renderDefs: (state, usedIds) => {
    const elements = state.elements ?? [];
    if (!elements.length || usedIds.size === 0) {
      return null;
    }

    const elementMap = new Map(elements.map((element) => [element.id, element]));
    const childrenByParent = new Map<string, CanvasElement[]>();
    elements.forEach((element) => {
      if (!element.parentId) {
        return;
      }
      const existing = childrenByParent.get(element.parentId) ?? [];
      existing.push(element);
      existing.sort(sortByZIndex);
      childrenByParent.set(element.parentId, existing);
    });

    const roots = Array.from(usedIds)
      .map((id) => elementMap.get(id))
      .filter((element): element is CanvasElement => Boolean(element && isDefinitionElement(element)))
      .filter((element) => {
        let currentParentId = element.parentId;
        while (currentParentId) {
          if (usedIds.has(currentParentId)) {
            return false;
          }
          currentParentId = elementMap.get(currentParentId)?.parentId ?? null;
        }
        return true;
      })
      .sort(sortByZIndex);
    const runtimeIdMap = buildDefinitionRuntimeIdMap(elements);
    const markups = roots
      .map((root) => serializeDefinitionTree(root, childrenByParent, state, runtimeIdMap))
      .filter((value): value is string => Boolean(value));

    if (!markups.length) {
      return null;
    }

    return React.createElement(
      React.Fragment,
      null,
      ...markups.map((markup, index) => React.createElement(ImportedDefinitionMarkup, {
        key: `imported-def-${index}`,
        markup,
      }))
    );
  },
  serializeDefs: (state, usedIds) => {
    const elements = state.elements ?? [];
    if (!elements.length || usedIds.size === 0) {
      return [];
    }

    const elementMap = new Map(elements.map((element) => [element.id, element]));
    const childrenByParent = new Map<string, CanvasElement[]>();
    elements.forEach((element) => {
      if (!element.parentId) {
        return;
      }
      const existing = childrenByParent.get(element.parentId) ?? [];
      existing.push(element);
      existing.sort(sortByZIndex);
      childrenByParent.set(element.parentId, existing);
    });

    const roots = Array.from(usedIds)
      .map((id) => elementMap.get(id))
      .filter((element): element is CanvasElement => Boolean(element && isDefinitionElement(element)))
      .filter((element) => {
        let currentParentId = element.parentId;
        while (currentParentId) {
          if (usedIds.has(currentParentId)) {
            return false;
          }
          currentParentId = elementMap.get(currentParentId)?.parentId ?? null;
        }
        return true;
      })
      .sort(sortByZIndex);
    const exportIdMap = buildDefinitionExportIdMap(elements);

    return roots
      .map((root) => serializeDefinitionTree(root, childrenByParent, state, exportIdMap))
      .filter((value): value is string => Boolean(value));
  },
});
