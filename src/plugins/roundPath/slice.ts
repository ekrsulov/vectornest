import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import { performPathRound } from '../../utils/pathOperationsUtils';
import { resolveTargetPath, mutatePathWithSelection } from '../../utils/path';

export interface RoundPathPluginSlice {
    pathRounding: {
        radius: number;
    };

    // Actions
    updatePathRounding: (settings: Partial<{ radius: number }>) => void;
    applyPathRounding: () => void;
}

// Type for accessing full canvas store
type FullCanvasState = {
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    pathRounding?: { radius: number };
    selectedCommands?: Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
    selectedIds?: string[];
    editingPoint?: { elementId: string } | null;
    selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
    clearSelectedCommands?: () => void;
};

export const createRoundPathPluginSlice: StateCreator<RoundPathPluginSlice, [], [], RoundPathPluginSlice> = (
    set,
    get
) => ({
    pathRounding: {
        radius: 5.0,
    },

    updatePathRounding: (settings) => {
        set((state) => ({
            pathRounding: { ...state.pathRounding, ...settings },
        }));
    },

    applyPathRounding: () => {
        const state = get() as unknown as FullCanvasState;
        const { radius } = state.pathRounding ?? { radius: 5 };

        const target = resolveTargetPath(state);
        if (!target) return;

        const { elementId } = target;

        const transform = (pathData: PathData) => performPathRound(pathData, radius);
        const newPathData = mutatePathWithSelection(state, elementId, transform);

        if (newPathData) {
            state.updateElement(elementId, {
                data: newPathData,
            });

            state.clearSelectedCommands?.();
        }
    },
});
