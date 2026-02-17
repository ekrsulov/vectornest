/**
 * Subpath Plugin Actions
 * 
 * Contains the business logic for subpath operations that were previously
 * coupled to the canvas store.
 */

import type { PathData, CanvasElement } from '../../types';
import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { SubpathPluginSlice } from './slice';
import { reverseSubPath, joinSubPaths } from '../../utils/pathOperationsUtils';
import { getSelectedSubpathElements } from '../../utils/pluginSliceHelpers';

/**
 * Split subpaths into separate path elements
 */
export function performPathSimplify(
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState();
  if (!state.selectedSubpaths) return;

  const selectedSubpathsState = state.selectedSubpaths as SubpathPluginSlice['selectedSubpaths'];

  const selectedPaths = state.elements.filter(el =>
    state.selectedIds.includes(el.id) && el.type === 'path'
  );

  const selectedSubpathElements = getSelectedSubpathElements(state.elements, selectedSubpathsState);

  // Handle full selected paths - split each subpath into separate paths
  selectedPaths.forEach(pathElement => {
    const pathData = pathElement.data as PathData;

    if (pathData.subPaths.length > 1) {
      // Create a new path for each subpath
      pathData.subPaths.forEach((subPath) => {
        const newPathData: PathData = {
          ...pathData,
          subPaths: [subPath]
        };

        state.addElement({
          type: 'path',
          data: newPathData
        });
      });

      // Remove the original path
      state.deleteElement(pathElement.id);
    }
  });

  // Handle selected subpaths - create new paths for each selected subpath
  selectedSubpathElements.forEach(({ element, subpathIndex }) => {
    const pathData = element.data as PathData;

    // Create a new path with only the selected subpath
    const newPathData: PathData = {
      ...pathData,
      subPaths: [pathData.subPaths[subpathIndex]]
    };

    state.addElement({
      type: 'path',
      data: newPathData
    });

    // Remove the selected subpath from the original path
    const remainingSubPaths = pathData.subPaths.filter((_, index) => index !== subpathIndex);
    if (remainingSubPaths.length > 0) {
      state.updateElement(element.id, {
        data: {
          ...pathData,
          subPaths: remainingSubPaths
        }
      });
    } else {
      // If no subpaths left, remove the original path
      state.deleteElement(element.id);
    }
  });

  // Clear selection after operation
  state.clearSelection();
  if (typeof state.clearSubpathSelection === 'function') {
    state.clearSubpathSelection();
  }
}

/**
 * Reverse the direction of selected subpaths
 */
export function performSubPathReverse(
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState();
  if (!state.selectedSubpaths) return;

  const selectedSubpathsState = state.selectedSubpaths as SubpathPluginSlice['selectedSubpaths'];
  const selectedSubpathElements = getSelectedSubpathElements(state.elements, selectedSubpathsState);

  // Reverse each selected subpath
  selectedSubpathElements.forEach(({ element, subpathIndex }) => {
    const pathData = element.data as PathData;
    const reversedSubPath = reverseSubPath(pathData.subPaths[subpathIndex]);

    // Update the subpath in the element
    const updatedSubPaths = [...pathData.subPaths];
    updatedSubPaths[subpathIndex] = reversedSubPath;

    state.updateElement(element.id, {
      data: {
        ...pathData,
        subPaths: updatedSubPaths
      }
    });
  });

  // Clear selection after operation
  state.clearSelection();
  if (typeof state.clearSubpathSelection === 'function') {
    state.clearSubpathSelection();
  }

  // Switch back to select mode after operation
  state.setActivePlugin('select');
}

/**
 * Join selected subpaths inside their elements or join eligible subpaths inside selected paths.
 */
export function performSubPathJoin(
  getState: StoreApi<CanvasStore>['getState']
): void {
  const state = getState();
  if (!state.selectedSubpaths) return;

  const selectedSubpathsState = state.selectedSubpaths as SubpathPluginSlice['selectedSubpaths'];

  const selectedPaths = state.elements.filter(el =>
    state.selectedIds.includes(el.id) && el.type === 'path'
  );

  const selectedSubpathElements = getSelectedSubpathElements(state.elements, selectedSubpathsState);

  // Handle full selected paths - join subpaths within each path
  selectedPaths.forEach(pathElement => {
    const pathData = pathElement.data as PathData;
    if (pathData.subPaths.length > 1) {
      const newSubPaths = joinSubPaths(pathData.subPaths);
      state.updateElement(pathElement.id, {
        data: {
          ...pathData,
          subPaths: newSubPaths
        }
      });
    }
  });

  // Handle selected subpaths - join only within selected subpath indices per element
  // Group selected subpaths by element
  const elementsMap: Record<string, { element: CanvasElement; indices: number[] }> = {};
  selectedSubpathElements.forEach(({ element, subpathIndex }) => {
    if (!elementsMap[element.id]) elementsMap[element.id] = { element, indices: [] };
    elementsMap[element.id].indices.push(subpathIndex);
  });

  Object.keys(elementsMap).forEach(elemId => {
    const { element, indices } = elementsMap[elemId];
    if (indices.length < 2) return; // Nothing to join
    const pathData = element.data as PathData;

    // Collect the subPaths to be joined in occurrence order
    const sortedIndices = indices.slice().sort((a, b) => a - b);
    const subPathsToJoin = sortedIndices.map(i => pathData.subPaths[i]);
    // Perform join on those subPaths
    const joined = joinSubPaths(subPathsToJoin);

    // Remove the original selected subpaths from the path
    const remainingSubPaths: PathData['subPaths'] = pathData.subPaths.filter((_, idx) => !sortedIndices.includes(idx));

    // Insert the joined subpaths at the position of the first selected index
    const insertIndex = sortedIndices[0];
    const newSubPaths = [...remainingSubPaths.slice(0, insertIndex), ...joined, ...remainingSubPaths.slice(insertIndex)];

    state.updateElement(element.id, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  });

  // Clear selection after operation
  state.clearSelection();
  if (typeof state.clearSubpathSelection === 'function') {
    state.clearSubpathSelection();
  }

  // Switch back to select mode after operation
  state.setActivePlugin('select');
}
