import type { CanvasElement, ElementTransform, GroupData, GroupElement } from '../../../../types';
import { buildElementMap } from '../../../../utils';
import { getElementTransformMatrix } from '../../../../utils/elementTransformUtils';
import { IDENTITY_MATRIX, isIdentityMatrix, type Matrix } from '../../../../utils/matrixUtils';
import { elementContributionRegistry } from '../../../../utils/elementContributionRegistry';
import { collectGroupDescendants as collectGroupDescendantsShared } from '../../../../utils/groupTraversalUtils';
import type {
  ElementMapCacheEntry,
  GroupFlagCache,
  GroupSliceGet,
  GroupSliceHelpers,
  IdSetCacheEntry,
} from './groupSliceTypes';
import type { CanvasStore } from '../../../canvasStore';

export const DEFAULT_GROUP_TRANSFORM: ElementTransform = {
  translateX: 0,
  translateY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

export const safeChildIds = (data: { childIds?: string[] }): string[] => (
  Array.isArray(data.childIds) ? data.childIds : []
);

const toIdSet = (ids: string[] | undefined): Set<string> => new Set(ids ?? []);

export const toggleId = (ids: string[] | undefined, elementId: string): string[] => {
  const next = toIdSet(ids);
  if (next.has(elementId)) {
    next.delete(elementId);
  } else {
    next.add(elementId);
  }
  return Array.from(next);
};

export const createIdSetCacheEntry = (): IdSetCacheEntry => ({
  source: undefined,
  set: new Set<string>(),
});

const readCachedIdSet = (cache: IdSetCacheEntry, ids: string[] | undefined): Set<string> => {
  if (cache.source !== ids) {
    cache.source = ids;
    cache.set = toIdSet(ids);
  }
  return cache.set;
};

const readCachedElementMap = (
  cache: ElementMapCacheEntry,
  elements: CanvasElement[],
  helpers: GroupSliceHelpers
): Map<string, CanvasElement> => {
  if (cache.source !== elements) {
    cache.source = elements;
    cache.map = helpers.getElementMap(elements);
  }
  return cache.map;
};

export const helpers: GroupSliceHelpers = {
  normalizeRootZIndices: (elements) => {
    const rootElements = elements
      .filter((element) => !element.parentId)
      .sort((a, b) => a.zIndex - b.zIndex);

    const zIndexMap = new Map<string, number>();
    rootElements.forEach((element, index) => {
      zIndexMap.set(element.id, index);
    });

    return elements.map((element) =>
      zIndexMap.has(element.id)
        ? { ...element, zIndex: zIndexMap.get(element.id) ?? element.zIndex }
        : element
    );
  },
  hasSelectedAncestor: (element, selectedIds, map) => {
    let currentParent = element.parentId ? map.get(element.parentId) : undefined;
    while (currentParent) {
      if (selectedIds.has(currentParent.id)) {
        return true;
      }
      currentParent = currentParent.parentId ? map.get(currentParent.parentId) : undefined;
    }
    return false;
  },
  findTopMostGroup: (element, map) => {
    if (!element.parentId) {
      return element;
    }

    let topMost = element;
    let currentParentId: string | null | undefined = element.parentId;

    while (currentParentId) {
      const parent = map.get(currentParentId);
      if (!parent) break;

      topMost = parent;
      currentParentId = parent.parentId;
    }

    return topMost;
  },
  getElementMap: (elements) => buildElementMap(elements),
  collectDescendants: (group, map) => collectGroupDescendantsShared(group.id, map),
};

/**
 * Shared helper for checking if an element has a flag set (hidden/locked),
 * traversing up the parent chain to check group-level flags.
 */
export const isElementFlagged = (
  get: GroupSliceGet,
  cache: GroupFlagCache,
  elementId: string,
  flag: 'hidden' | 'locked'
): boolean => {
  const state = get() as CanvasStore;
  const directIds = flag === 'hidden'
    ? readCachedIdSet(cache.hidden, state.hiddenElementIds)
    : readCachedIdSet(cache.locked, state.lockedElementIds);
  if (directIds.has(elementId)) return true;

  const elementMap = readCachedElementMap(cache.elementMap, state.elements, helpers);
  let current = elementMap.get(elementId);
  while (current) {
    if (current.type === 'group' && (current.data as GroupData)[flag === 'hidden' ? 'isHidden' : 'isLocked']) {
      return true;
    }
    if (current.type === 'path' && directIds.has(current.id)) {
      return true;
    }
    current = current.parentId ? elementMap.get(current.parentId) : undefined;
  }
  return false;
};

export const ungroupGroupInternal = (
  group: GroupElement,
  elements: CanvasElement[]
): { elements: CanvasElement[]; releasedChildIds: string[]; groupTransformMatrix: Matrix } => {
  const childIds = [...safeChildIds(group.data)];
  const childIdSet = new Set(childIds);
  const parentId = group.parentId;

  const groupMatrix = getElementTransformMatrix(group);
  const hasGroupTransform = !isIdentityMatrix(groupMatrix);

  let updatedElements = elements.map((element) => {
    if (childIdSet.has(element.id)) {
      let updatedElement: CanvasElement = { ...element, parentId };

      // Apply parent transform on ungroup so children keep their visual position.
      if (hasGroupTransform) {
        const transformedElement = elementContributionRegistry.applyAffineTransform(
          updatedElement,
          groupMatrix,
          3
        );
        if (transformedElement) {
          updatedElement = transformedElement;
        }
      }

      return updatedElement;
    }
    return element;
  });

  if (parentId) {
    updatedElements = updatedElements.map((element) => {
      if (element.id === parentId && element.type === 'group') {
        const parentData = element.data;
        const newChildIds: string[] = [];
        safeChildIds(parentData).forEach((childId: string) => {
          if (childId === group.id) {
            newChildIds.push(...childIds);
          } else {
            newChildIds.push(childId);
          }
        });
        return {
          ...element,
          data: {
            ...parentData,
            childIds: newChildIds,
          },
        };
      }
      return element;
    });
  }

  updatedElements = updatedElements.filter((element) => element.id !== group.id);

  return {
    elements: updatedElements,
    releasedChildIds: childIds,
    groupTransformMatrix: hasGroupTransform ? groupMatrix : IDENTITY_MATRIX,
  };
};
