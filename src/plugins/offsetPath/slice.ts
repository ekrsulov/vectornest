import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & OffsetPathSlice;
import { applyOffsetToPath } from '../../utils/pathOffsetUtils';
import type { GroupElement, PathElement } from '../../types';
import { selectionHasOnlyPaths, getPathsFromSelection } from '../../utils/selectionGuards';

export interface OffsetPathSlice {
  // UI State
  offsetDistance: number;
  offsetJoinType: 'round' | 'miter' | 'bevel';
  offsetMiterLimit: number;
  isApplyingOffset: boolean;

  // Actions
  setOffsetDistance: (distance: number) => void;
  setOffsetJoinType: (joinType: 'round' | 'miter' | 'bevel') => void;
  setOffsetMiterLimit: (limit: number) => void;
  canApplyOffset: () => boolean;
  applyOffsetPath: () => void;
}

export const createOffsetPathSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OffsetPathSlice
> = (set, get) => {
  return {
    // Initial state
    offsetDistance: 5,
    offsetJoinType: 'round',
    offsetMiterLimit: 4,
    isApplyingOffset: false,

    // Setters
    setOffsetDistance: (distance: number) => {
      set({ offsetDistance: distance } as Partial<CanvasStore>);
    },

    setOffsetJoinType: (joinType: 'round' | 'miter' | 'bevel') => {
      set({ offsetJoinType: joinType } as Partial<CanvasStore>);
    },

    setOffsetMiterLimit: (limit: number) => {
      set({ offsetMiterLimit: limit } as Partial<CanvasStore>);
    },

    // Check if offset can be applied
    canApplyOffset: () => {
      const state = get();
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];

      if (selectedIds.length === 0) return false;
      if (!selectionHasOnlyPaths(selectedIds, elements)) return false;
      const paths = getPathsFromSelection(selectedIds, elements);
      return paths.length > 0;
    },

    // Apply offset path operation
    applyOffsetPath: () => {
      const state = get() as FullStore;
      const selectedIds = state.selectedIds || [];
      const elements = state.elements || [];
      const addElement = state.addElement;
      const selectElements = state.selectElements;

      if (!addElement || !selectElements) return;

      set({ isApplyingOffset: true } as Partial<CanvasStore>);

      const offsetDistance = state.offsetDistance;
      const offsetJoinType = state.offsetJoinType;
      const offsetMiterLimit = state.offsetMiterLimit;
      const newElementIds: string[] = [];

      selectedIds.forEach(id => {
        const element = elements.find(el => el.id === id);

        if (element?.type === 'path') {
          const offsetPath = applyOffsetToPath(
            element,
            offsetDistance,
            offsetJoinType,
            offsetMiterLimit
          );

          if (offsetPath) {
            const newElementId = addElement(offsetPath);
            newElementIds.push(newElementId);
          }
        } else if (element?.type === 'group') {
          // For groups, recursively offset all paths within
          const groupElement = element as GroupElement;
          const childIds = groupElement.data.childIds || [];

          childIds.forEach(childId => {
            const childElement = elements.find(el => el.id === childId);
            if (childElement?.type === 'path') {
              const offsetPath = applyOffsetToPath(
                childElement as PathElement,
                offsetDistance,
                offsetJoinType,
                offsetMiterLimit
              );

              if (offsetPath) {
                const newElementId = addElement(offsetPath);
                newElementIds.push(newElementId);
              }
            }
          });
        }
      });

      // Select the newly created offset paths
      if (newElementIds.length > 0) {
        selectElements(newElementIds);
      }

      set({ isApplyingOffset: false } as Partial<CanvasStore>);
    },
  };
}
