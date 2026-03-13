import type { CanvasElement } from '../types';
import type { CanvasStore } from '../store/canvasStore';

const sortByZIndex = (left: CanvasElement, right: CanvasElement): number => left.zIndex - right.zIndex;

type MinimalAnimationReference = {
  targetElementId?: string;
  mpath?: string;
};

type TextPathReferenceLike = {
  href?: string;
};

const getUseHref = (element: CanvasElement): string | null => {
  if (element.type !== 'use') {
    return null;
  }

  const href = (element.data as { href?: unknown }).href;
  return typeof href === 'string' && href.trim().length > 0 ? href : null;
};

const getTextPathHref = (element: CanvasElement): string | null => {
  const textPath = (element.data as { textPath?: TextPathReferenceLike } | undefined)?.textPath;
  if (!textPath || typeof textPath.href !== 'string') {
    return null;
  }

  const href = textPath.href.trim();
  if (!href) {
    return null;
  }

  return href.startsWith('#') ? href.slice(1) : href;
};

const buildChildrenByParent = (elements: CanvasElement[]): Map<string, CanvasElement[]> => {
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

  return childrenByParent;
};

const buildReferenceMap = (elements: CanvasElement[]): Map<string, CanvasElement> => {
  const referenceMap = new Map<string, CanvasElement>();

  elements.forEach((element) => {
    referenceMap.set(element.id, element);
    const sourceId = (element.data as { sourceId?: unknown } | undefined)?.sourceId;
    if (typeof sourceId === 'string' && sourceId.trim().length > 0) {
      referenceMap.set(sourceId, element);
    }
  });

  return referenceMap;
};

const getAnimationReferencedIds = (
  elementId: string,
  state?: CanvasStore,
): string[] => {
  const animationState = state as (CanvasStore & { animations?: MinimalAnimationReference[] }) | undefined;
  const animations = animationState?.animations ?? [];
  const referencedIds = new Set<string>();

  animations.forEach((animation) => {
    if (animation.targetElementId !== elementId) {
      return;
    }

    if (typeof animation.mpath === 'string' && animation.mpath.trim().length > 0) {
      referencedIds.add(animation.mpath);
    }
  });

  return Array.from(referencedIds);
};

export const isDefinitionElement = (element: CanvasElement | null | undefined): boolean => (
  Boolean((element?.data as { isDefinition?: boolean } | undefined)?.isDefinition)
);

const includeElementSubtree = (
  element: CanvasElement,
  childrenByParent: Map<string, CanvasElement[]>,
  included: Map<string, CanvasElement>,
): void => {
  if (included.has(element.id)) {
    return;
  }

  included.set(element.id, element);
  const children = childrenByParent.get(element.id) ?? [];
  children.forEach((child) => includeElementSubtree(child, childrenByParent, included));
};

export const expandElementsWithReferencedDefinitions = (
  elements: CanvasElement[],
  state?: CanvasStore,
): CanvasElement[] => {
  if (!state?.elements?.length || elements.length === 0) {
    return elements;
  }

  const stateElements = state.elements;
  const elementMap = buildReferenceMap(stateElements);
  const childrenByParent = buildChildrenByParent(stateElements);
  const included = new Map<string, CanvasElement>();

  elements.forEach((element) => includeElementSubtree(element, childrenByParent, included));

  let changed = true;
  while (changed) {
    changed = false;

    Array.from(included.values()).forEach((element) => {
      const href = getUseHref(element);
      if (href) {
        const target = elementMap.get(href);
        if (target && isDefinitionElement(target) && !included.has(target.id)) {
          includeElementSubtree(target, childrenByParent, included);
          changed = true;
        }
      }

      const textPathHref = getTextPathHref(element);
      if (textPathHref) {
        const target = elementMap.get(textPathHref);
        if (target && isDefinitionElement(target) && !included.has(target.id)) {
          includeElementSubtree(target, childrenByParent, included);
          changed = true;
        }
      }

      getAnimationReferencedIds(element.id, state).forEach((refId) => {
        const target = elementMap.get(refId);
        if (!target || !isDefinitionElement(target) || included.has(target.id)) {
          return;
        }

        includeElementSubtree(target, childrenByParent, included);
        changed = true;
      });
    });
  }

  return Array.from(included.values()).sort(sortByZIndex);
};

export const collectReferencedDefinitionIds = (elements: CanvasElement[]): Set<string> => {
  const ids = new Set<string>();

  elements.forEach((element) => {
    if (isDefinitionElement(element)) {
      ids.add(element.id);
    }
  });

  return ids;
};
