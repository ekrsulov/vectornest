/**
 * Group Traversal Utilities
 *
 * Shared helpers for accessing group child IDs and traversing group hierarchies.
 * Consolidates previously duplicated logic across the codebase.
 */

import type { CanvasElement } from '../types';

/**
 * Safely extracts child IDs from group data.
 * Works with any object that may have a `childIds` property.
 */
export const safeChildIds = (data: { childIds?: string[] }): string[] =>
  Array.isArray(data.childIds) ? data.childIds : [];

/**
 * Safely extracts child IDs from a CanvasElement.
 * Returns empty array for non-group elements.
 */
export const safeChildIdsFromElement = (element: CanvasElement): string[] => {
  if (element.type !== 'group') {
    return [];
  }
  return Array.isArray(element.data.childIds) ? element.data.childIds : [];
};

/**
 * Collects all descendant element IDs of a group, given a pre-built element map.
 * Returns all transitive children of the group.
 */
export function collectGroupDescendants(
  groupId: string,
  elementMap: Map<string, CanvasElement>,
): string[] {
  const group = elementMap.get(groupId);
  if (!group || group.type !== 'group') {
    return [];
  }

  const descendants: string[] = [];
  const visited = new Set<string>();
  const queue = [...safeChildIds(group.data)];

  for (let i = 0; i < queue.length; i++) {
    const childId = queue[i];
    if (!childId || visited.has(childId)) continue;
    visited.add(childId);

    descendants.push(childId);
    const child = elementMap.get(childId);
    if (child && child.type === 'group') {
      queue.push(...safeChildIds(child.data));
    }
  }

  return descendants;
}
