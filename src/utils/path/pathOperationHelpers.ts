import type { CanvasElement, PathData, SubPath } from '../../types';
import { extractSubpaths } from '../pathParserUtils';
import { buildElementMap } from '../elementMapUtils';

// Type for accessing full canvas store
type FullCanvasState = {
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    selectedCommands?: Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
    selectedIds?: string[];
    editingPoint?: { elementId: string } | null;
    selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
    clearSelectedCommands?: () => void;
};

/**
 * Resolves the target path element from the current selection state.
 * Priority: selectedCommands > editingPoint > selectedIds
 */
export function resolveTargetPath(state: FullCanvasState): { elementId: string; element: CanvasElement } | null {
    // Find the active element
    let targetElementId: string | null = null;
    if ((state.selectedCommands?.length ?? 0) > 0) {
        targetElementId = state.selectedCommands?.[0].elementId ?? null;
    } else if (state.editingPoint) {
        targetElementId = state.editingPoint.elementId;
    } else if (state.selectedIds && state.selectedIds.length > 0) {
        targetElementId = state.selectedIds[0];
    }

    if (!targetElementId) return null;

    const elementMap = buildElementMap(state.elements);
    const element = elementMap.get(targetElementId);
    if (!element || element.type !== 'path') return null;

    return { elementId: targetElementId, element };
}

/**
 * Applies a transformation to selected subpaths or the entire path.
 * If selectedSubpaths are provided, applies transform to each selected subpath individually.
 * Otherwise, applies transform to the entire path.
 */
export function mutateSubpaths(
    pathData: PathData,
    selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
    transform: (pathData: PathData) => PathData | null
): PathData | null {
    if (selectedSubpaths.length > 0) {
        // Apply transformation only to selected subpaths
        const allCommands = pathData.subPaths.flat();
        const subpaths = extractSubpaths(allCommands);
        const newSubPaths: SubPath[] = [];

        subpaths.forEach((subpathData, index) => {
            const isSelected = selectedSubpaths.some((sp) => sp.subpathIndex === index);

            if (isSelected) {
                const tempPathData: PathData = {
                    ...pathData,
                    subPaths: [subpathData.commands],
                };

                const transformedTempPath = transform(tempPathData);

                if (transformedTempPath && transformedTempPath.subPaths.length > 0) {
                    newSubPaths.push(transformedTempPath.subPaths[0]);
                } else {
                    newSubPaths.push(subpathData.commands);
                }
            } else {
                newSubPaths.push(subpathData.commands);
            }
        });

        return { ...pathData, subPaths: newSubPaths };
    } else {
        // Apply transformation to the entire path
        return transform(pathData);
    }
}

/**
 * Applies a transformation to the path based on current selection state.
 * Handles selectedSubpaths or entire path.
 */
export function mutatePathWithSelection(
    state: FullCanvasState,
    elementId: string,
    transform: (pathData: PathData) => PathData | null
): PathData | null {
    const elementMap = buildElementMap(state.elements);
    const element = elementMap.get(elementId);
    if (!element || element.type !== 'path') return null;

    const pathData = element.data as PathData;
    const selectedSubpathsForElement = (state.selectedSubpaths ?? []).filter((sp) => sp.elementId === elementId);

    if (selectedSubpathsForElement.length > 0) {
        // Apply to selected subpaths
        return mutateSubpaths(pathData, selectedSubpathsForElement, transform);
    } else {
        // Apply to entire path
        return transform(pathData);
    }
}