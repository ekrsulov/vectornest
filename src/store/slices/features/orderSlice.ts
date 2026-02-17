import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';

export interface OrderSlice {
  // Actions
  bringToFront: () => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
}

/**
 * Shared helper that reorders selected elements one step in the given direction.
 * Uses a pre-built Map for O(1) lookups instead of repeated .find() calls.
 */
const reorderElements = (
  state: { elements: CanvasElement[]; selectedIds: string[] },
  direction: 'forward' | 'backward'
): { elements: CanvasElement[] } => {
  const { selectedIds } = state;
  if (selectedIds.length === 0) return { elements: state.elements };

  // Build element map once — O(n) instead of O(n) per .find()
  const elementMap = new Map<string, CanvasElement>();
  const indexMap = new Map<string, number>();
  state.elements.forEach((el, i) => {
    elementMap.set(el.id, el);
    indexMap.set(el.id, i);
  });

  const elements = [...state.elements];

  // Sort selected elements so the one closest to the boundary moves first,
  // preventing elements from "jumping" past multiple positions.
  const sortedIds = [...selectedIds].sort((a, b) => {
    const elA = elementMap.get(a);
    const elB = elementMap.get(b);
    return direction === 'forward'
      ? (elB?.zIndex ?? 0) - (elA?.zIndex ?? 0)
      : (elA?.zIndex ?? 0) - (elB?.zIndex ?? 0);
  });

  sortedIds.forEach((selectedId: string) => {
    const currentIdx = indexMap.get(selectedId);
    const currentElement = currentIdx !== undefined ? elements[currentIdx] : undefined;
    if (!currentElement || currentElement.parentId) return;

    // Find the element immediately adjacent in z-index order
    let neighbor: CanvasElement | undefined;
    if (direction === 'forward') {
      // Closest element above (smallest z-index greater than current)
      for (const el of elements) {
        if (el.parentId || el.zIndex <= currentElement.zIndex) continue;
        if (!neighbor || el.zIndex < neighbor.zIndex) neighbor = el;
      }
    } else {
      // Closest element below (largest z-index less than current)
      for (const el of elements) {
        if (el.parentId || el.zIndex >= currentElement.zIndex) continue;
        if (!neighbor || el.zIndex > neighbor.zIndex) neighbor = el;
      }
    }

    if (neighbor) {
      const neighborIdx = indexMap.get(neighbor.id);
      if (neighborIdx === undefined || currentIdx === undefined) return;
      const swappedCurrent = { ...currentElement, zIndex: neighbor.zIndex };
      const swappedNeighbor = { ...neighbor, zIndex: currentElement.zIndex };
      elements[currentIdx] = swappedCurrent;
      elements[neighborIdx] = swappedNeighbor;
      // Update maps for subsequent iterations
      elementMap.set(currentElement.id, swappedCurrent);
      elementMap.set(neighbor.id, swappedNeighbor);
      indexMap.set(currentElement.id, neighborIdx);
      indexMap.set(neighbor.id, currentIdx);
    }
  });

  return { elements };
};

export const createOrderSlice: StateCreator<CanvasStore, [], [], OrderSlice> = (set, _get, _api) => ({
  // Actions
  bringToFront: () => {
    set((state) => {
      const selectedIds = state.selectedIds;
      if (selectedIds.length === 0) return state;

      const selectedSet = new Set(selectedIds);
      const rootElements = state.elements.filter((el: CanvasElement) => !el.parentId);
      let maxZIndex = 0;
      for (const el of rootElements) {
        if (el.zIndex > maxZIndex) maxZIndex = el.zIndex;
      }
      let offset = 0;
      return {
        elements: state.elements.map((el: CanvasElement) => {
          if (selectedSet.has(el.id) && !el.parentId) {
            offset++;
            return { ...el, zIndex: maxZIndex + offset };
          }
          return el;
        }),
      };
    });
  },

  sendForward: () => {
    set((state) => reorderElements(state, 'forward'));
  },

  sendBackward: () => {
    set((state) => reorderElements(state, 'backward'));
  },

  sendToBack: () => {
    set((state) => {
      const selectedIds = state.selectedIds;
      if (selectedIds.length === 0) return state;

      const selectedSet = new Set(selectedIds);
      const rootElements = state.elements.filter((el: CanvasElement) => !el.parentId);
      let minZIndex = 0;
      for (const el of rootElements) {
        if (el.zIndex < minZIndex) minZIndex = el.zIndex;
      }
      let offset = 0;
      return {
        elements: state.elements.map((el: CanvasElement) => {
          if (selectedSet.has(el.id) && !el.parentId) {
            offset++;
            return { ...el, zIndex: minZIndex - offset };
          }
          return el;
        }),
      };
    });
  },
});