import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import { performPathSimplifyPaperJS } from '../../utils/pathOperationsUtils';
import { extractSubpaths } from '../../utils/pathParserUtils';
import { resolveTargetPath, mutatePathWithSelection } from '../../utils/path';

export interface PathSimplificationPluginSlice {
    pathSimplification: {
        tolerance: number;
    };

    // Actions
    updatePathSimplification: (settings: Partial<{ tolerance: number }>) => void;
    applyPathSimplification: () => void;
}

// Type for accessing full canvas store
type FullCanvasState = {
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    pathSimplification?: { tolerance: number };
    selectedCommands?: Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
    selectedIds?: string[];
    editingPoint?: { elementId: string } | null;
    selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
    clearSelectedCommands?: () => void;
};

export const createPathSimplificationPluginSlice: StateCreator<
    PathSimplificationPluginSlice,
    [],
    [],
    PathSimplificationPluginSlice
> = (set, get) => ({
    pathSimplification: {
        tolerance: 1.0,
    },

    updatePathSimplification: (settings) => {
        set((state) => ({
            pathSimplification: { ...state.pathSimplification, ...settings },
        }));
    },

    applyPathSimplification: () => {
        const state = get() as unknown as FullCanvasState;
        const { tolerance } = state.pathSimplification ?? { tolerance: 1 };

        const target = resolveTargetPath(state);
        if (!target) return;

        const { elementId } = target;
        const element = state.elements.find((el) => el.id === elementId);
        if (!element || element.type !== 'path') return;

        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();

        // Handle selected commands case
        if ((state.selectedCommands?.length ?? 0) > 0) {
            const selectedCommands = (state.selectedCommands ?? []).filter((cmd) => cmd.elementId === elementId);
            if (selectedCommands.length > 0) {
                const commandIndices = selectedCommands.map((cmd) => cmd.commandIndex);
                const minCommandIndex = Math.min(...commandIndices);
                const maxCommandIndex = Math.max(...commandIndices);

                let selectedSubPath = allCommands.slice(minCommandIndex, maxCommandIndex + 1);
                let addedArtificialM = false;

                // Ensure starts with M command
                if (selectedSubPath.length > 0 && selectedSubPath[0].type !== 'M') {
                    let startPosition: { x: number; y: number } = { x: 0, y: 0 };

                    if (minCommandIndex > 0) {
                        const prevCommand = allCommands[minCommandIndex - 1];
                        if (prevCommand.type !== 'Z' && 'position' in prevCommand) {
                            startPosition = prevCommand.position;
                        }
                    }

                    if (startPosition.x === 0 && startPosition.y === 0) {
                        const firstCmd = selectedSubPath[0];
                        if (firstCmd.type !== 'Z' && 'position' in firstCmd) {
                            startPosition = firstCmd.position;
                        }
                    }

                    selectedSubPath = [{ type: 'M' as const, position: startPosition }, ...selectedSubPath];
                    addedArtificialM = true;
                }

                const tempPathData: PathData = {
                    ...pathData,
                    subPaths: [selectedSubPath],
                };

                const transform = (pathData: PathData) => performPathSimplifyPaperJS(pathData, tolerance);
                const transformedTempPath = transform(tempPathData);

                if (transformedTempPath && transformedTempPath.subPaths.length > 0) {
                    let transformedCommands = transformedTempPath.subPaths[0];

                    if (addedArtificialM && transformedCommands.length > 0 && transformedCommands[0].type === 'M') {
                        transformedCommands = transformedCommands.slice(1);
                    }

                    if (minCommandIndex > 0 && transformedCommands.length > 0 && transformedCommands[0].type === 'M') {
                        transformedCommands = [{ type: 'L', position: transformedCommands[0].position }, ...transformedCommands.slice(1)];
                    }

                    const newCommands = [...allCommands];
                    newCommands.splice(minCommandIndex, maxCommandIndex - minCommandIndex + 1, ...transformedCommands);

                    const newSubPaths = extractSubpaths(newCommands).map((s) => s.commands);

                    state.updateElement(elementId, {
                        data: { ...pathData, subPaths: newSubPaths },
                    });

                    state.clearSelectedCommands?.();
                }
                return;
            }
        }

        // Handle selected subpaths or entire path
        const transform = (pathData: PathData) => performPathSimplifyPaperJS(pathData, tolerance);
        const newPathData = mutatePathWithSelection(state, elementId, transform);

        if (newPathData) {
            state.updateElement(elementId, {
                data: newPathData,
            });

            state.clearSelectedCommands?.();
        }
    },
});
