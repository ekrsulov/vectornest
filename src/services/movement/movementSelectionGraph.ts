import type { CanvasElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';

export const collectGroupsToMove = (
  selectedIds: string[],
  elementMap: Map<string, CanvasElement>
): Set<string> => {
  const groupsToMoveIds = new Set<string>();

  selectedIds.forEach((id) => {
    const element = elementMap.get(id);
    if (!element) {
      return;
    }

    if (element.type === 'group') {
      groupsToMoveIds.add(element.id);
    }

    let currentParentId = element.parentId;
    const visitedAncestors = new Set<string>();
    while (currentParentId) {
      if (visitedAncestors.has(currentParentId)) {
        break;
      }
      visitedAncestors.add(currentParentId);

      const parent = elementMap.get(currentParentId);
      if (parent && parent.type === 'group') {
        groupsToMoveIds.add(parent.id);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }
  });

  return groupsToMoveIds;
};

export const collectRootGroups = (
  groupsToMoveIds: Set<string>,
  elementMap: Map<string, CanvasElement>
): Set<string> => {
  const rootGroupIds = new Set<string>();

  groupsToMoveIds.forEach((groupId) => {
    let currentParentId = elementMap.get(groupId)?.parentId ?? null;
    const visited = new Set<string>();
    while (currentParentId) {
      if (visited.has(currentParentId)) {
        break;
      }
      visited.add(currentParentId);
      if (groupsToMoveIds.has(currentParentId)) {
        return;
      }
      currentParentId = elementMap.get(currentParentId)?.parentId ?? null;
    }
    rootGroupIds.add(groupId);
  });

  return rootGroupIds;
};

export const collectMovedSubtreeIds = (
  rootGroupIds: Set<string>,
  state: CanvasStore
): Set<string> => {
  const movedSubtreeIds = new Set<string>();
  rootGroupIds.forEach((groupId) => {
    movedSubtreeIds.add(groupId);
    const descendants = state.getGroupDescendants ? state.getGroupDescendants(groupId) : [];
    descendants.forEach((descendantId) => movedSubtreeIds.add(descendantId));
  });
  return movedSubtreeIds;
};

export const collectMovedGroupSourceIds = (
  rootGroupIds: Set<string>,
  elementMap: Map<string, CanvasElement>
): Set<string> => {
  const movedGroupSourceIds = new Set<string>();
  rootGroupIds.forEach((groupId) => {
    const group = elementMap.get(groupId);
    if (!group || group.type !== 'group') {
      return;
    }
    const sourceId = (group.data as { sourceId?: string }).sourceId;
    if (sourceId) {
      movedGroupSourceIds.add(sourceId);
    }
  });
  return movedGroupSourceIds;
};
