import { describe, expect, it } from 'vitest';
import type { CanvasElement, GroupElement, PathElement } from '../../types';
import type { CanvasRenderContext } from './CanvasRendererRegistry';
import { haveSameGroupSubtree } from './renderingUtils';

const createPath = (id: string, parentId: string | null, x: number): PathElement => ({
  id,
  type: 'path',
  parentId,
  zIndex: 0,
  data: {
    subPaths: [[
      { type: 'M', position: { x, y: 0 } },
      { type: 'L', position: { x: x + 10, y: 0 } },
    ]],
    strokeWidth: 1,
    strokeColor: '#000000',
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
  },
});

const createGroup = (
  id: string,
  parentId: string | null,
  childIds: string[],
  transformMatrix?: [number, number, number, number, number, number]
): GroupElement => ({
  id,
  type: 'group',
  parentId,
  zIndex: 0,
  data: {
    childIds,
    name: id,
    isExpanded: true,
    isHidden: false,
    isLocked: false,
    transform: {
      translateX: 0,
      translateY: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    transformMatrix,
  },
});

const createContext = (
  elements: CanvasElement[],
  hiddenIds: string[] = []
): Pick<CanvasRenderContext, 'elementMap' | 'isElementHidden' | 'isElementSelected' | 'isElementLocked'> => {
  const hiddenSet = new Set(hiddenIds);
  const elementMap = new Map(elements.map((element) => [element.id, element]));

  return {
    elementMap,
    isElementHidden: (elementId: string) => hiddenSet.has(elementId),
    isElementSelected: () => false,
    isElementLocked: () => false,
  };
};

describe('haveSameGroupSubtree', () => {
  it('invalidates when a nested descendant path changes inside scaled imported groups', () => {
    const previousOuterGroup = createGroup('outer-group', null, ['inner-group'], [12.24043, 0, 0, 12.24043, 131.9453, 185.78513692129374]);
    const previousInnerGroup = createGroup('inner-group', 'outer-group', ['heart-path'], [1, 0, 0, 1, 0, 0]);
    const previousPath = createPath('heart-path', 'inner-group', 27.8);

    const nextOuterGroup = previousOuterGroup;
    const nextInnerGroup = previousInnerGroup;
    const nextPath = createPath('heart-path', 'inner-group', 30.8);

    const previousContext = createContext([previousOuterGroup, previousInnerGroup, previousPath]);
    const nextContext = createContext([nextOuterGroup, nextInnerGroup, nextPath]);

    expect(haveSameGroupSubtree(previousContext, nextContext, 'outer-group')).toBe(false);
  });

  it('stays stable when the nested subtree is unchanged', () => {
    const outerGroup = createGroup('outer-group', null, ['inner-group'], [12.24043, 0, 0, 12.24043, 131.9453, 185.78513692129374]);
    const innerGroup = createGroup('inner-group', 'outer-group', ['heart-path'], [1, 0, 0, 1, 0, 0]);
    const path = createPath('heart-path', 'inner-group', 27.8);

    const previousContext = createContext([outerGroup, innerGroup, path]);
    const nextContext = createContext([outerGroup, innerGroup, path]);

    expect(haveSameGroupSubtree(previousContext, nextContext, 'outer-group')).toBe(true);
  });

  it('does not traverse hidden descendants when the whole group stays hidden', () => {
    const previousOuterGroup = createGroup('outer-group', null, ['inner-group']);
    const previousInnerGroup = createGroup('inner-group', 'outer-group', ['heart-path']);
    const previousPath = createPath('heart-path', 'inner-group', 27.8);
    const nextPath = createPath('heart-path', 'inner-group', 30.8);

    const previousContext = createContext([previousOuterGroup, previousInnerGroup, previousPath], ['outer-group']);
    const nextContext = createContext([previousOuterGroup, previousInnerGroup, nextPath], ['outer-group']);

    expect(haveSameGroupSubtree(previousContext, nextContext, 'outer-group')).toBe(true);
  });
});
