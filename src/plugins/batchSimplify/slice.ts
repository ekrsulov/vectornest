import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import { performPathSimplifyPaperJS } from '../../utils/pathOperationsUtils';

export interface BatchSimplifyPluginSlice {
    batchSimplify: {
        tolerance: number;
    };

    // Actions
    updateBatchSimplify: (settings: Partial<{ tolerance: number }>) => void;
    applyBatchSimplify: () => void;
}

type FullCanvasState = {
    elements: CanvasElement[];
    selectedIds?: string[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    batchSimplify?: { tolerance: number };
};

export const createBatchSimplifySlice: StateCreator<
    BatchSimplifyPluginSlice,
    [],
    [],
    BatchSimplifyPluginSlice
> = (set, get) => ({
    batchSimplify: {
        tolerance: 1.0,
    },

    updateBatchSimplify: (settings) => {
        set((state) => ({
            batchSimplify: { ...state.batchSimplify, ...settings },
        }));
    },

    applyBatchSimplify: () => {
        const state = get() as unknown as FullCanvasState;
        const { tolerance } = state.batchSimplify ?? { tolerance: 1 };
        const selectedIds = state.selectedIds ?? [];

        if (selectedIds.length === 0) return;

        for (const elementId of selectedIds) {
            const element = state.elements.find((el) => el.id === elementId);
            if (!element || element.type !== 'path') continue;

            const pathData = element.data as PathData;
            const simplified = performPathSimplifyPaperJS(pathData, tolerance);

            if (simplified) {
                state.updateElement(elementId, {
                    data: simplified,
                });
            }
        }
    },
});
