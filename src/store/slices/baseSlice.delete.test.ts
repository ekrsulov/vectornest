import { beforeEach, describe, expect, it } from 'vitest';
import { canvasStoreApi } from '../canvasStore';

const createGroupData = (name: string, childIds: string[] = []) => ({
  childIds,
  name,
  isLocked: false,
  isHidden: false,
  isExpanded: true,
  transform: {
    translateX: 0,
    translateY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  },
});

const createCollapseFixture = () => {
  const api = canvasStoreApi.getState();

  const grandParentId = api.addElement({
    type: 'group',
    data: createGroupData('grand-parent'),
  });
  const parentId = api.addElement({
    type: 'group',
    parentId: grandParentId,
    data: createGroupData('parent'),
  });
  const grandSiblingId = api.addElement({
    type: 'fixture-leaf',
    parentId: grandParentId,
    data: {},
  });
  const childAId = api.addElement({
    type: 'fixture-leaf',
    parentId: parentId,
    data: {},
  });
  const childBId = api.addElement({
    type: 'fixture-leaf',
    parentId: parentId,
    data: {},
  });

  api.updateElement(grandParentId, {
    data: {
      childIds: [parentId, grandSiblingId],
    },
  });
  api.updateElement(parentId, {
    data: {
      childIds: [childAId, childBId],
    },
  });

  return {
    grandParentId,
    parentId,
    grandSiblingId,
    childAId,
    childBId,
  };
};

beforeEach(() => {
  canvasStoreApi.setState({ elements: [], selectedIds: [] });
});

describe('baseSlice deletion actions', () => {
  it('deleteElement collapses a parent group when only one child remains', () => {
    const { childAId, childBId, parentId, grandParentId } = createCollapseFixture();
    const api = canvasStoreApi.getState();

    api.deleteElement(childAId);

    const state = canvasStoreApi.getState();
    expect(state.elements.some((element) => element.id === childAId)).toBe(false);
    expect(state.elements.some((element) => element.id === parentId)).toBe(false);

    const remainingChild = state.elements.find((element) => element.id === childBId);
    expect(remainingChild?.parentId).toBe(grandParentId);

    const grandParent = state.elements.find((element) => element.id === grandParentId);
    expect(grandParent?.type).toBe('group');
    const grandParentChildIds = (grandParent?.type === 'group' ? grandParent.data.childIds : []) ?? [];
    expect(grandParentChildIds).toContain(childBId);
    expect(grandParentChildIds).not.toContain(parentId);
  });

  it('deleteSelectedElements reuses the same collapse behavior and clears selection', () => {
    const { childAId, childBId, parentId, grandParentId } = createCollapseFixture();
    canvasStoreApi.setState({ selectedIds: [childAId] });
    const api = canvasStoreApi.getState();

    api.deleteSelectedElements();

    const state = canvasStoreApi.getState();
    expect(state.selectedIds).toEqual([]);
    expect(state.elements.some((element) => element.id === childAId)).toBe(false);
    expect(state.elements.some((element) => element.id === parentId)).toBe(false);

    const remainingChild = state.elements.find((element) => element.id === childBId);
    expect(remainingChild?.parentId).toBe(grandParentId);
  });
});
