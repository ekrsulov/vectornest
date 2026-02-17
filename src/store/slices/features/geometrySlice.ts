import type { StateCreator } from 'zustand';
import type { PathData } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { performPathUnion as performUnionOp, performPathSubtraction, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide } from '../../../utils/pathOperationsUtils';
import { getSelectedPaths } from '../../../utils/pluginSliceHelpers';

export interface GeometrySlice {
    performPathUnion: () => void;
    performPathUnionPaperJS: () => void;
    performPathSubtraction: () => void;
    performPathIntersect: () => void;
    performPathExclude: () => void;
    performPathDivide: () => void;
}

// Generic handler for boolean path operations
const performBooleanOperation = (
    set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
    get: () => CanvasStore,
    operation: (paths: PathData[]) => PathData | null,
    minPaths: number = 2
) => {
    const state = get();
    const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths ?? []);

    if (allPaths.length < minPaths) return;

    const result = operation(allPaths);
    if (result) {
        const firstSelectedId = state.selectedIds[0] || (state.selectedSubpaths ?? [])[0]?.elementId;
        if (firstSelectedId) {
            // Collect IDs to remove
            const idsToRemove = new Set([
                ...state.selectedIds.filter((id: string) => id !== firstSelectedId),
                ...(state.selectedSubpaths ?? []).slice(1).map((sp: { elementId: string }) => sp.elementId)
            ]);
            idsToRemove.delete(firstSelectedId);

            // Batch: update the result element, remove others, and clear selection in one set()
            set((currentState) => ({
                elements: currentState.elements
                    .filter((el) => !idsToRemove.has(el.id))
                    .map((el) => {
                        if (el.id === firstSelectedId) {
                            return { ...el, data: result };
                        }
                        return el;
                    }),
                selectedIds: [],
                selectedSubpaths: [],
            }));
            return;
        }
    }

    // Clear selection even if operation produced no result
    set(() => ({ selectedIds: [], selectedSubpaths: [] }));
};

// Generic handler for binary boolean path operations
const performBinaryBooleanOperation = (
    set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
    get: () => CanvasStore,
    operation: (path1: PathData, path2: PathData) => PathData | null
) => {
    const state = get();
    const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths ?? []);

    if (allPaths.length !== 2) return;

    const result = operation(allPaths[0], allPaths[1]);
    if (result) {
        const firstSelectedId = state.selectedIds[0] || (state.selectedSubpaths ?? [])[0]?.elementId;
        if (firstSelectedId) {
            const secondSelectedId = state.selectedIds[1] || (state.selectedSubpaths ?? [])[1]?.elementId;

            // Batch: update result, remove second element, clear selection in one set()
            set((currentState) => ({
                elements: currentState.elements
                    .filter((el) => el.id !== secondSelectedId)
                    .map((el) => {
                        if (el.id === firstSelectedId) {
                            return { ...el, data: result };
                        }
                        return el;
                    }),
                selectedIds: [],
                selectedSubpaths: [],
            }));
            return;
        }
    }

    // Clear selection even if operation produced no result
    set(() => ({ selectedIds: [], selectedSubpaths: [] }));
};

export const createGeometrySlice: StateCreator<CanvasStore, [], [], GeometrySlice> = (set, get) => {
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    return {
        performPathUnion: () => {
            performBooleanOperation(setStore, get, performUnionOp, 2);
        },

        performPathUnionPaperJS: () => {
            performBooleanOperation(setStore, get, performPathUnionPaperJS, 2);
        },

        performPathSubtraction: () => {
            performBinaryBooleanOperation(setStore, get, performPathSubtraction);
        },

        performPathIntersect: () => {
            performBinaryBooleanOperation(setStore, get, performPathIntersect);
        },

        performPathExclude: () => {
            performBinaryBooleanOperation(setStore, get, performPathExclude);
        },

        performPathDivide: () => {
            performBinaryBooleanOperation(setStore, get, performPathDivide);
        },
    };
};
