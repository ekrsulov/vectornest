/**
 * Duplication utilities for canvas elements.
 * 
 * This module provides consolidated duplication logic used by:
 * - Context menu duplicate action (useFloatingContextMenuActions)
 * - Drag-to-duplicate functionality (duplicateOnDrag plugin)
 * 
 * Key features:
 * - Creates completely independent copies with new IDs
 * - Handles nested group hierarchies recursively
 * - Applies offset only to root elements (children inherit parent transforms)
 * - Prevents duplicate hierarchies when parent and children are both selected
 */
import type { CanvasElement, CanvasElementInput, GroupData } from '../types';
import { type Bounds } from './boundsUtils';
import { mergeBounds } from './measurementUtils';
import { elementContributionRegistry } from './elementContributionRegistry';

interface DuplicateElementOptions {
  offsetX?: number;
  offsetY?: number;
  applyAutoOffset?: boolean; // Internal flag to prevent recursive offset application
}

/**
 * Calculates bounds for a single element in absolute canvas coordinates.
 * For groups: recursively calculates bounds of all children and applies group transform.
 * For paths: calculates path bounds and applies all parent transforms up the hierarchy.
 */
function getElementBounds(
  element: CanvasElement,
  elementMap: Map<string, CanvasElement>
): Bounds | null {
  if (element.type === 'group') {
    const childBoundsList: Bounds[] = [];

    // Recursively collect bounds of ALL descendant paths
    // Paths have absolute coordinates, so we just combine their bounds directly
    const collectDescendantBounds = (group: CanvasElement) => {
      if (group.type !== 'group') return;
      const gData = group.data as GroupData;

      for (const childId of gData.childIds) {
        const child = elementMap.get(childId);
        if (!child) continue;

        if (child.type === 'group') {
          // Recurse into nested groups
          collectDescendantBounds(child);
        } else {
          const childBounds = elementContributionRegistry.getBounds(child, {
            viewport: { zoom: 1, panX: 0, panY: 0 },
            elementMap,
          });
          if (childBounds) {
            childBoundsList.push(childBounds);
          }
        }
      }
    };

    collectDescendantBounds(element);

    return mergeBounds(childBoundsList);
  }

  const bounds = elementContributionRegistry.getBounds(element, {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    elementMap,
  });

  if (!bounds) {
    return null;
  }

  // Apply all parent transforms up the hierarchy
  let currentElement: CanvasElement | undefined = element;
  let totalTranslateX = 0;
  let totalTranslateY = 0;

  while (currentElement && currentElement.parentId) {
    const parent = elementMap.get(currentElement.parentId);
    if (!parent || parent.type !== 'group') break;

    const groupData = parent.data as GroupData;
    totalTranslateX += groupData.transform.translateX;
    totalTranslateY += groupData.transform.translateY;
    currentElement = parent;
  }

  return {
    minX: bounds.minX + totalTranslateX,
    minY: bounds.minY + totalTranslateY,
    maxX: bounds.maxX + totalTranslateX,
    maxY: bounds.maxY + totalTranslateY,
  };
}

/**
 * Calculates offset to place duplicated elements 20px to the right of the original.
 * This ensures the duplicate is completely outside the space occupied by the original,
 * with no overlap at all.
 * 
 * Strategy: 
 * - offsetX = width of selection + 20px (places duplicate 20px to the right of rightmost edge)
 * - offsetY = 0 (keeps vertical alignment)
 * 
 * @param elementIds - IDs of elements being duplicated
 * @param elementMap - Map of all elements
 * @returns Offset object with offsetX and offsetY
 */
function calculateDuplicationOffset(
  elementIds: string[],
  elementMap: Map<string, CanvasElement>
): DuplicateElementOptions {
  const boundsList: Bounds[] = [];

  // Calculate combined bounds of all selected elements in absolute coordinates
  for (const id of elementIds) {
    const element = elementMap.get(id);
    if (!element) continue;

    const bounds = getElementBounds(element, elementMap);
    if (bounds) {
      boundsList.push(bounds);
    }
  }

  const merged = mergeBounds(boundsList);

  // If no valid bounds, use default offset
  if (!merged) {
    return { offsetX: 20, offsetY: 0 };
  }

  const width = merged.maxX - merged.minX;

  // Place duplicate 20px to the right of the rightmost edge
  // offsetX = width + 20 ensures complete separation
  return {
    offsetX: width + 20,
    offsetY: 0
  };
}

/**
 * Recursively duplicates a canvas element (including groups with children).
 * Creates completely independent copies with new IDs and no relationships to originals.
 * 
 * @param element - The element to duplicate
 * @param elementMap - Map of all existing elements (for resolving children)
 * @param addElement - Function to add a new element to the store
 * @param updateElement - Function to update an existing element in the store
 * @param newParentId - Optional new parent ID for the duplicated element
 * @param options - Optional configuration (offsetX, offsetY for translation)
 * @returns The ID of the newly created element
 */
export function duplicateElement(
  element: CanvasElement,
  elementMap: Map<string, CanvasElement>,
  addElement: (element: CanvasElementInput) => string,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  newParentId?: string | null,
  options: DuplicateElementOptions = {}
): string {
  const { offsetX = 0, offsetY = 0, applyAutoOffset = false } = options;

  if (element.type === 'group') {
    const groupData = element.data as GroupData;

    // Only apply offset if this is marked as root-level duplication (applyAutoOffset = true)
    // and it's actually a root group (no newParentId)
    const isRootGroup = newParentId === undefined;
    const shouldApplyOffset = isRootGroup && applyAutoOffset && (offsetX !== 0 || offsetY !== 0);
    const transform = shouldApplyOffset
      ? {
        ...groupData.transform,
        translateX: groupData.transform.translateX + offsetX,
        translateY: groupData.transform.translateY + offsetY,
      }
      : groupData.transform;

    // Create the group with temporary empty childIds
    const tempGroupData: GroupData = {
      childIds: [],
      name: `${groupData.name} Copy`,
      isLocked: groupData.isLocked,
      isHidden: groupData.isHidden,
      isExpanded: groupData.isExpanded !== undefined ? groupData.isExpanded : true,
      transform,
    };

    const tempGroupWithoutId: CanvasElementInput = {
      type: 'group',
      parentId: newParentId !== undefined ? newParentId : element.parentId,
      data: tempGroupData,
    };

    const groupId = addElement(tempGroupWithoutId);

    // Duplicate all children recursively with the new group as parent
    // ALWAYS pass offset to children if it exists (even if we didn't apply it to this group's transform)
    // This ensures nested groups and their paths move correctly
    // But mark as non-root so nested groups don't modify their own transform
    const newChildIds: string[] = [];
    groupData.childIds.forEach((childId: string) => {
      const child = elementMap.get(childId);
      if (child) {
        const newChildId = duplicateElement(
          child,
          elementMap,
          addElement,
          updateElement,
          groupId,
          (offsetX !== 0 || offsetY !== 0) ? { offsetX, offsetY, applyAutoOffset: false } : {}
        );
        newChildIds.push(newChildId);
      }
    });

    // Update group with actual child IDs
    updateElement(groupId, { data: { ...tempGroupData, childIds: newChildIds } });
    return groupId;
  }

  // Duplicate non-group elements (paths or plugin elements)
  const shouldApplyOffset = (offsetX !== 0 || offsetY !== 0);
  let clone = elementContributionRegistry.cloneElement(element);

  if (shouldApplyOffset) {
    clone = elementContributionRegistry.translateElement(
      clone,
      offsetX,
      offsetY,
      2
    ) ?? clone;
  }

  const { id: _ignored, zIndex: _z, ...rest } = clone as CanvasElement;

  const newElementWithoutId: CanvasElementInput = {
    ...(rest as CanvasElementInput),
    parentId: newParentId !== undefined ? newParentId : element.parentId,
  };

  return addElement(newElementWithoutId);
}

/**
 * Finds the root element (topmost parent) for a given element ID.
 * Traverses up the parent hierarchy until reaching an element without a parent.
 * 
 * @param elementId - The ID of the element to find the root for
 * @param elementMap - Map of all elements
 * @returns The ID of the root element
 */
function findRootElement(
  elementId: string,
  elementMap: Map<string, CanvasElement>
): string {
  const element = elementMap.get(elementId);
  if (!element) return elementId;

  let rootId = elementId;
  let currentElement = element;

  // Traverse up the parent hierarchy
  while (currentElement.parentId) {
    const parent = elementMap.get(currentElement.parentId);
    if (!parent) break;
    currentElement = parent;
    rootId = currentElement.id;
  }

  return rootId;
}

/**
 * Finds all root elements (elements without parents in the hierarchy) from a list of element IDs.
 * If both a parent and its children are in the list, only the parent will be returned.
 * This prevents duplicating the same hierarchy multiple times.
 * 
 * @param elementIds - Array of element IDs to process
 * @param elementMap - Map of all elements
 * @returns Set of unique root element IDs
 */
function findRootElements(
  elementIds: string[],
  elementMap: Map<string, CanvasElement>
): Set<string> {
  const rootElements = new Set<string>();

  for (const elementId of elementIds) {
    const rootId = findRootElement(elementId, elementMap);
    rootElements.add(rootId);
  }

  return rootElements;
}

/**
 * Duplicates multiple elements, automatically finding their root elements to avoid
 * duplicating the same hierarchy multiple times. Each root element is duplicated
 * recursively with all its children.
 * 
 * If no offset is provided, it will be calculated automatically based on the size
 * of the selected elements to ensure no overlap (width + 20px).
 * 
 * @param elementIds - Array of element IDs to duplicate
 * @param elementMap - Map of all existing elements
 * @param addElement - Function to add a new element to the store
 * @param updateElement - Function to update an existing element in the store
 * @param options - Optional configuration:
 *   - offsetX, offsetY: Manual offset (if not provided, calculated automatically)
 *   - applyAutoOffset: If false, no automatic offset is applied (default: true, used by duplicateOnDrag)
 * @returns Array of IDs of the newly created root elements
 */
export function duplicateElements(
  elementIds: string[],
  elementMap: Map<string, CanvasElement>,
  addElement: (element: CanvasElementInput) => string,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  options?: DuplicateElementOptions & { applyAutoOffset?: boolean }
): string[] {
  const rootElements = findRootElements(elementIds, elementMap);

  // Calculate smart offset if not provided and applyAutoOffset is not false
  const shouldApplyOffset = options?.applyAutoOffset !== false;
  const offset = options?.offsetX !== undefined || options?.offsetY !== undefined
    ? { offsetX: options.offsetX || 0, offsetY: options.offsetY || 0 }
    : shouldApplyOffset
      ? calculateDuplicationOffset(Array.from(rootElements), elementMap)
      : { offsetX: 0, offsetY: 0 };

  const duplicatedIds: string[] = [];

  rootElements.forEach(rootId => {
    const element = elementMap.get(rootId);
    if (element) {
      const newId = duplicateElement(
        element,
        elementMap,
        addElement,
        updateElement,
        undefined,
        { ...offset, applyAutoOffset: true } // Mark that this is root level
      );
      duplicatedIds.push(newId);
    }
  });

  return duplicatedIds;
}
