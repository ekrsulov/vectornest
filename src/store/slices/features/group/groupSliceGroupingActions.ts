import { generateShortId } from '../../../../utils/idGenerator';
import { IDENTITY_MATRIX, isIdentityMatrix, type Matrix } from '../../../../utils/matrixUtils';
import type { GroupElement } from '../../../../types';
import type { CanvasStore } from '../../../canvasStore';
import { DEFAULT_GROUP_TRANSFORM, helpers, safeChildIds, ungroupGroupInternal } from './groupSliceHelpers';
import type { GroupSlice, GroupSliceGet, GroupSliceSet } from './groupSliceTypes';

type GroupingActions = Pick<
  GroupSlice,
  | 'createGroupFromSelection'
  | 'ungroupSelectedGroups'
  | 'ungroupGroupById'
  | 'renameGroup'
  | 'setGroupExpanded'
  | 'getGroupById'
  | 'getGroupDescendants'
>;

export const createGroupSliceGroupingActions = (
  set: GroupSliceSet,
  get: GroupSliceGet
): GroupingActions => ({
  createGroupFromSelection: (name) => {
    const state = get() as CanvasStore;
    const selectedIds = state.selectedIds;
    if (selectedIds.length < 2) {
      return null;
    }

    const elementMap = helpers.getElementMap(state.elements);

    // Replace each selected element with its topmost parent group (if it has one).
    const topMostElements = new Map<string, ReturnType<typeof elementMap.get>>();
    selectedIds.forEach((id) => {
      const element = elementMap.get(id);
      if (!element) return;

      const topMost = helpers.findTopMostGroup(element, elementMap);
      topMostElements.set(topMost.id, topMost);
    });

    const selectedSet = new Set(topMostElements.keys());
    const normalizedSelection = Array.from(topMostElements.values())
      .filter((element): element is NonNullable<typeof element> => Boolean(element))
      .filter((element) => !helpers.hasSelectedAncestor(element, selectedSet, elementMap));

    if (normalizedSelection.length < 2) {
      return null;
    }

    const parentCandidates = new Set(
      normalizedSelection.map((element) => element.parentId)
    );
    const [parentIdCandidate] = [...parentCandidates];
    const groupParentId = parentCandidates.size === 1 ? parentIdCandidate ?? null : null;

    const parentElement = groupParentId ? elementMap.get(groupParentId) : null;

    let orderedChildIds: string[] = [];
    if (parentElement && parentElement.type === 'group') {
      const selectionSet = new Set(normalizedSelection.map((element) => element.id));
      const parentChildIds = safeChildIds(parentElement.data);
      orderedChildIds = parentChildIds.filter((childId: string) => selectionSet.has(childId));
    } else {
      orderedChildIds = normalizedSelection
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => element.id);
    }

    const groupId = generateShortId('grp');
    const groupName = name?.trim().length ? name.trim() : `Group ${state.groupNameCounter}`;

    set((storeState) => {
      const current = storeState as CanvasStore;
      const selectionSet = new Set(orderedChildIds);

      let updatedElements = current.elements.map((element) =>
        selectionSet.has(element.id) ? { ...element, parentId: groupId } : element
      );

      if (groupParentId) {
        updatedElements = updatedElements.map((element) => {
          if (element.id === groupParentId && element.type === 'group') {
            const parentData = element.data;
            const newChildIds: string[] = [];
            let inserted = false;
            safeChildIds(parentData).forEach((childId: string) => {
              if (selectionSet.has(childId)) {
                if (!inserted) {
                  newChildIds.push(groupId);
                  inserted = true;
                }
              } else {
                newChildIds.push(childId);
              }
            });
            if (!inserted) {
              newChildIds.push(groupId);
            }
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

      const zIndices = normalizedSelection.map((element) => element.zIndex);
      let minZIndex = zIndices[0];
      for (let i = 1; i < zIndices.length; i++) {
        if (zIndices[i] < minZIndex) minZIndex = zIndices[i];
      }

      const groupElement: GroupElement = {
        id: groupId,
        type: 'group',
        parentId: groupParentId ?? null,
        zIndex: minZIndex,
        data: {
          childIds: orderedChildIds,
          name: groupName,
          isExpanded: true,
          isHidden: false,
          isLocked: false,
          transform: { ...DEFAULT_GROUP_TRANSFORM },
        },
      };

      updatedElements = helpers.normalizeRootZIndices([...updatedElements, groupElement]);

      return {
        elements: updatedElements,
        selectedIds: [groupId],
        groupNameCounter: current.groupNameCounter + 1,
      };
    });

    return groupId;
  },

  ungroupSelectedGroups: () => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const groupsToUngroup = state.selectedIds
      .map((id) => elementMap.get(id))
      .filter((element): element is GroupElement => element?.type === 'group');

    if (groupsToUngroup.length === 0) {
      return;
    }

    const animationDeltas: Array<{ elementId: string; from: Matrix; to: Matrix }> = [];

    set((storeState) => {
      const current = storeState as CanvasStore;
      let updatedElements = [...current.elements];
      const newSelection: string[] = [];

      groupsToUngroup.forEach((group) => {
        const result = ungroupGroupInternal(group, updatedElements);
        updatedElements = result.elements;
        newSelection.push(...result.releasedChildIds);

        if (
          !isIdentityMatrix(result.groupTransformMatrix)
        ) {
          result.releasedChildIds.forEach((childId) => {
            animationDeltas.push({
              elementId: childId,
              from: IDENTITY_MATRIX,
              to: result.groupTransformMatrix,
            });
          });
        }
      });

      updatedElements = helpers.normalizeRootZIndices(updatedElements);

      return {
        elements: updatedElements,
        selectedIds: newSelection.length > 0 ? Array.from(new Set(newSelection)) : [],
      };
    });

    if (animationDeltas.length > 0) {
      const applyAnimationTransformDelta = (get() as CanvasStore).applyAnimationTransformDelta;
      if (applyAnimationTransformDelta) {
        applyAnimationTransformDelta(animationDeltas);
      }
    }
  },

  ungroupGroupById: (groupId) => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const group = elementMap.get(groupId);

    if (!group || group.type !== 'group') {
      return;
    }

    let animationDeltas: Array<{ elementId: string; from: Matrix; to: Matrix }> = [];

    set((storeState) => {
      const current = storeState as CanvasStore;
      const result = ungroupGroupInternal(group as GroupElement, current.elements);
      const updatedElements = helpers.normalizeRootZIndices(result.elements);

      const hasTransform = !isIdentityMatrix(result.groupTransformMatrix);

      if (hasTransform) {
        animationDeltas = result.releasedChildIds.map((childId) => ({
          elementId: childId,
          from: IDENTITY_MATRIX,
          to: result.groupTransformMatrix,
        }));
      }

      return {
        elements: updatedElements,
        selectedIds: result.releasedChildIds.length > 0
          ? Array.from(new Set(result.releasedChildIds))
          : [],
      };
    });

    if (animationDeltas.length > 0) {
      const applyAnimationTransformDelta = (get() as CanvasStore).applyAnimationTransformDelta;
      if (applyAnimationTransformDelta) {
        applyAnimationTransformDelta(animationDeltas);
      }
    }
  },

  renameGroup: (groupId, name) => {
    const trimmed = name.trim();
    if (!trimmed.length) {
      return;
    }
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              name: trimmed,
            },
          };
        }
        return element;
      }),
    }));
  },

  setGroupExpanded: (groupId, expanded) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              isExpanded: expanded,
            },
          };
        }
        return element;
      }),
    }));
  },

  getGroupById: (groupId) => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const element = elementMap.get(groupId);
    return element && element.type === 'group' ? element as GroupElement : null;
  },

  getGroupDescendants: (groupId) => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const element = elementMap.get(groupId);
    if (!element || element.type !== 'group') {
      return [];
    }
    return helpers.collectDescendants(element as GroupElement, elementMap);
  },
});
