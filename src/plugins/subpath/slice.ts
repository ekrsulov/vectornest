import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & SubpathPluginSlice;
import type { PathData, Command, CanvasElement } from '../../types';
import { extractSubpaths } from '../../utils/pathParserUtils';
import { measureSubpathBounds } from '../../utils/measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { translateCommands, scaleCommands } from '../../utils/transformationUtils';
import { groupSubpathsByElement, moveSubpathsWithinElement, deleteSubpathsFromElement } from '../../utils/subpathHelpers';

// Helper interface for subpath bounds
interface SubpathWithBounds {
  elementId: string;
  subpathIndex: number;
  subpathCommands: Command[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

// Helper function to apply transformations to multiple subpaths efficiently
const applySubpathTransformations = (
  state: CanvasStore,
  subpathBounds: SubpathWithBounds[],
  getTransformation: (subpathInfo: SubpathWithBounds) => { deltaX: number; deltaY: number }
) => {
  // Group transformations by element to avoid multiple updates
  const elementUpdates = new Map<string, {
    pathData: PathData;
    transformations: Array<{ subpathIndex: number; deltaX: number; deltaY: number }>
  }>();

  // Collect all transformations first
  subpathBounds.forEach(subpathInfo => {
    const { deltaX, deltaY } = getTransformation(subpathInfo);

    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) { // Only update if there's a meaningful change
      const element = state.elements.find((el) => el.id === subpathInfo.elementId);
      if (element) {
        const pathData = element.data as PathData;

        if (!elementUpdates.has(subpathInfo.elementId)) {
          elementUpdates.set(subpathInfo.elementId, {
            pathData,
            transformations: []
          });
        }

        elementUpdates.get(subpathInfo.elementId)!.transformations.push({
          subpathIndex: subpathInfo.subpathIndex,
          deltaX: formatToPrecision(deltaX, PATH_DECIMAL_PRECISION),
          deltaY: formatToPrecision(deltaY, PATH_DECIMAL_PRECISION)
        });
      }
    }
  });

  // Apply all transformations per element
  elementUpdates.forEach(({ pathData, transformations }, elementId) => {
    const allCommands = pathData.subPaths.flat();
    const subpaths = extractSubpaths(allCommands);

    // Apply all transformations to this element's subpaths
    transformations.forEach(({ subpathIndex, deltaX, deltaY }) => {
      const originalSubpath = subpaths[subpathIndex];
      if (originalSubpath) {
        const transformedCommands = translateCommands(originalSubpath.commands, deltaX, deltaY);
        subpaths[subpathIndex] = { ...originalSubpath, commands: transformedCommands };
      }
    });

    // Rebuild the subPaths with all transformations applied
    const newSubPaths = subpaths.map(sp => sp.commands);
    state.updateElement(elementId, {
      data: { ...pathData, subPaths: newSubPaths }
    });
  });
};

// Helper function to collect subpath bounds information
const collectSubpathBounds = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): SubpathWithBounds[] => {
  const subpathBounds: SubpathWithBounds[] = [];

  selectedSubpaths.forEach(selected => {
    const element = state.elements.find((el) => el.id === selected.elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      const allCommands = pathData.subPaths.flat();
      const subpaths = extractSubpaths(allCommands);
      const subpathCommands = subpaths[selected.subpathIndex]?.commands;

      if (subpathCommands) {
        const bounds = measureSubpathBounds(subpathCommands, pathData.strokeWidth ?? 1);

        subpathBounds.push({
          elementId: selected.elementId,
          subpathIndex: selected.subpathIndex,
          subpathCommands,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          centerY: (bounds.minY + bounds.maxY) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      }
    }
  });

  return subpathBounds;
};

// Helper function for alignment operations
const performSubpathAlignment = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
  getTargetPosition: (bounds: SubpathWithBounds[]) => (subpathInfo: SubpathWithBounds) => { deltaX: number; deltaY: number }
) => {
  if (selectedSubpaths.length < 2) return;

  const subpathBounds = collectSubpathBounds(state, selectedSubpaths);

  if (subpathBounds.length < 2) return;

  // Apply transformations using helper function
  applySubpathTransformations(state, subpathBounds, getTargetPosition(subpathBounds));
};

// Generic distribution helper
const distributeSubpathsAlongAxis = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
  axis: 'horizontal' | 'vertical'
) => {
  if (selectedSubpaths.length < 3) return;

  const subpathBounds = collectSubpathBounds(state, selectedSubpaths);

  if (subpathBounds.length < 3) return;

  const isHorizontal = axis === 'horizontal';

  // Sort by current center position along the axis
  subpathBounds.sort((a, b) =>
    isHorizontal ? a.centerX - b.centerX : a.centerY - b.centerY
  );

  // Calculate distribution
  const firstBound = isHorizontal ? subpathBounds[0].bounds.minX : subpathBounds[0].bounds.minY;
  const lastBound = isHorizontal
    ? subpathBounds[subpathBounds.length - 1].bounds.maxX
    : subpathBounds[subpathBounds.length - 1].bounds.maxY;

  const totalSpan = lastBound - firstBound;
  const totalElementsSize = subpathBounds.reduce((sum, sb) =>
    sum + (isHorizontal ? sb.width : sb.height), 0
  );
  const availableSpace = totalSpan - totalElementsSize;
  const spaceBetween = availableSpace / (subpathBounds.length - 1);

  // Calculate transformations for all subpaths
  const transformations = new Map<string, { deltaX: number; deltaY: number }>();
  let currentPosition = firstBound;

  subpathBounds.forEach((subpathInfo, index) => {
    if (index === 0) {
      // First element stays in place
      currentPosition += isHorizontal ? subpathInfo.width : subpathInfo.height;
    } else if (index === subpathBounds.length - 1) {
      // Last element stays in place
      return;
    } else {
      // Distribute middle elements
      currentPosition += spaceBetween;
      const targetPosition = currentPosition;
      const currentBound = isHorizontal ? subpathInfo.bounds.minX : subpathInfo.bounds.minY;
      const delta = targetPosition - currentBound;

      transformations.set(`${subpathInfo.elementId}-${subpathInfo.subpathIndex}`, {
        deltaX: isHorizontal ? delta : 0,
        deltaY: isHorizontal ? 0 : delta
      });
      currentPosition += isHorizontal ? subpathInfo.width : subpathInfo.height;
    }
  });

  // Apply transformations using helper function
  const subpathsToTransform = subpathBounds.filter((_, index) =>
    index !== 0 && index !== subpathBounds.length - 1
  );

  applySubpathTransformations(state, subpathsToTransform, (subpathInfo) => {
    const key = `${subpathInfo.elementId}-${subpathInfo.subpathIndex}`;
    return transformations.get(key) || { deltaX: 0, deltaY: 0 };
  });
};

// Helper function to match subpath sizes to the largest
const matchSubpathSizeToLargest = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
  dimension: 'width' | 'height'
) => {
  if (selectedSubpaths.length < 2) return;

  const subpathBounds = collectSubpathBounds(state, selectedSubpaths);

  if (subpathBounds.length < 2) return;

  // Find the largest dimension
  const largestSize = Math.max(...subpathBounds.map(sb =>
    dimension === 'width' ? sb.width : sb.height
  ));

  // Group transformations by element to avoid multiple updates
  const elementUpdates = new Map<string, {
    pathData: PathData;
    scaledSubpaths: Array<{ subpathIndex: number; commands: Command[] }>
  }>();

  // Scale each subpath to match the largest dimension
  subpathBounds.forEach(subpathInfo => {
    const currentSize = dimension === 'width' ? subpathInfo.width : subpathInfo.height;
    if (currentSize === 0) return; // Avoid division by zero

    const scaleFactor = largestSize / currentSize;

    // Only scale if the element is not already the largest
    if (Math.abs(scaleFactor - 1) < 0.0001) return;

    const element = state.elements.find((el) => el.id === subpathInfo.elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;

      // Scale the subpath commands - scale only on the specified dimension
      const scaleX = dimension === 'width' ? scaleFactor : 1;
      const scaleY = dimension === 'height' ? scaleFactor : 1;

      const scaledCommands = scaleCommands(
        subpathInfo.subpathCommands,
        scaleX,
        scaleY,
        subpathInfo.centerX,
        subpathInfo.centerY
      );

      if (!elementUpdates.has(subpathInfo.elementId)) {
        elementUpdates.set(subpathInfo.elementId, {
          pathData,
          scaledSubpaths: []
        });
      }

      elementUpdates.get(subpathInfo.elementId)!.scaledSubpaths.push({
        subpathIndex: subpathInfo.subpathIndex,
        commands: scaledCommands
      });
    }
  });

  // Apply all scaled subpaths per element
  elementUpdates.forEach(({ pathData, scaledSubpaths }, elementId) => {
    const allCommands = pathData.subPaths.flat();
    const subpaths = extractSubpaths(allCommands);

    // Apply all scaled subpaths to this element
    scaledSubpaths.forEach(({ subpathIndex, commands }) => {
      const originalSubpath = subpaths[subpathIndex];
      if (originalSubpath) {
        subpaths[subpathIndex] = { ...originalSubpath, commands };
      }
    });

    // Rebuild the subPaths with all scaled subpaths applied
    const newSubPaths = subpaths.map(sp => sp.commands);
    state.updateElement(elementId, {
      data: { ...pathData, subPaths: newSubPaths }
    });
  });
};

// Helper function to process subpath order changes
const processSubpathOrderChange = (
  state: CanvasStore,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>,
  direction: 'toFront' | 'forward' | 'backward' | 'toBack'
): Array<{ elementId: string; subpathIndex: number }> => {
  if (selectedSubpaths.length === 0) return [];

  // Group subpaths by element ID
  const subpathsByElement = groupSubpathsByElement(selectedSubpaths);

  const newSelection: Array<{ elementId: string; subpathIndex: number }> = [];

  // Process each element
  Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
    const element = state.elements.find((el) => el.id === elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;

      // Use helper to move subpaths
      const { newSubPaths, newIndices } = moveSubpathsWithinElement(pathData.subPaths, subpathIndices, direction);

      // Update selection with new indices
      newIndices.forEach(index => {
        newSelection.push({ elementId, subpathIndex: index });
      });

      // Update the element
      state.updateElement(elementId, {
        data: { ...pathData, subPaths: newSubPaths }
      });
    }
  });

  return newSelection;
};

export interface SubpathPluginSlice {
  // State
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  draggingSubpaths: {
    isDragging: boolean;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[]; // Store the original commands to avoid cumulative transformations
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
    currentDeltaX?: number;
    currentDeltaY?: number;
  } | null;

  // Actions
  selectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>) => void;
  clearSubpathSelection: () => void;
  getSelectedSubpathsCount: () => number;
  deleteSelectedSubpaths: () => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;

  // Drag actions
  startDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  updateDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  stopDraggingSubpaths: () => void;

  // Order functions
  bringSubpathToFront: () => void;
  sendSubpathForward: () => void;
  sendSubpathBackward: () => void;
  sendSubpathToBack: () => void;

  // Alignment functions
  alignLeftSubpaths: () => void;
  alignCenterSubpaths: () => void;
  alignRightSubpaths: () => void;
  alignTopSubpaths: () => void;
  alignMiddleSubpaths: () => void;
  alignBottomSubpaths: () => void;

  // Distribution functions
  distributeHorizontallySubpaths: () => void;
  distributeVerticallySubpaths: () => void;

  // Match size functions
  matchWidthToLargestSubpaths: () => void;
  matchHeightToLargestSubpaths: () => void;
}

export const createSubpathPluginSlice: StateCreator<CanvasStore, [], [], SubpathPluginSlice> = (set, get) => ({
  // Initial state
  selectedSubpaths: [],
  draggingSubpaths: null,

  // Actions
  selectSubpath: (elementId, subpathIndex, multiSelect = false) => {
    set((state) => {
      const fullState = state as FullStore;
      // In subpath mode, only allow selection of subpaths that belong to selected paths
      if (!fullState.selectedIds.includes(elementId)) {
        return state;
      }

      const isSelected = (state.selectedSubpaths ?? []).some(
        (s: { elementId: string; subpathIndex: number }) => s.elementId === elementId && s.subpathIndex === subpathIndex
      );

      if (multiSelect) {
        return {
          selectedSubpaths: isSelected
            ? (state.selectedSubpaths ?? []).filter((s: { elementId: string; subpathIndex: number }) => !(s.elementId === elementId && s.subpathIndex === subpathIndex))
            : [...(state.selectedSubpaths ?? []), { elementId, subpathIndex }]
        };
      } else {
        return {
          selectedSubpaths: [{ elementId, subpathIndex }]
        };
      }
    });
  },

  selectSubpaths: (subpaths) => {
    set({ selectedSubpaths: subpaths });
  },

  clearSubpathSelection: () => {
    set({ selectedSubpaths: [] });
  },

  getSelectedSubpathsCount: () => {
    return (get().selectedSubpaths?.length ?? 0);
  },

  deleteSelectedSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = groupSubpathsByElement(selectedSubpaths);

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;

        // Remove subpaths using helper
        const newSubPaths = deleteSubpathsFromElement(pathData.subPaths, subpathIndices);

        // If no subpaths left, delete the entire element
        if (newSubPaths.length === 0) {
          state.deleteElement(elementId);
        } else {
          // Update the element with remaining subpaths
          state.updateElement(elementId, {
            data: { ...pathData, subPaths: newSubPaths }
          });
        }
      }
    });

    // Clear selection after deletion
    set({ selectedSubpaths: [] });
  },

  moveSelectedSubpaths: (deltaX: number, deltaY: number) => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    const precision = state.settings.keyboardMovementPrecision;

    if (selectedSubpaths.length === 0) return;

    // Group subpaths by element ID
    const subpathsByElement = groupSubpathsByElement(selectedSubpaths);

    // Process each element
    Object.entries(subpathsByElement).forEach(([elementId, subpathIndices]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const newSubPaths = [...pathData.subPaths];

        subpathIndices.forEach(subpathIndex => {
          if (subpathIndex < newSubPaths.length) {
            newSubPaths[subpathIndex] = translateCommands(newSubPaths[subpathIndex], deltaX, deltaY, {
              precision: precision,
              roundToIntegers: precision === 0
            });
          }
        });

        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });
  },

  // Order functions
  bringSubpathToFront: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    const newSelection = processSubpathOrderChange(state, selectedSubpaths, 'toFront');
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathForward: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    const newSelection = processSubpathOrderChange(state, selectedSubpaths, 'forward');
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathBackward: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    const newSelection = processSubpathOrderChange(state, selectedSubpaths, 'backward');
    set({ selectedSubpaths: newSelection });
  },

  sendSubpathToBack: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    const newSelection = processSubpathOrderChange(state, selectedSubpaths, 'toBack');
    set({ selectedSubpaths: newSelection });
  },

  // Alignment functions
  alignLeftSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const minX = Math.min(...subpathBounds.map(sb => sb.bounds.minX));
      return (subpathInfo) => ({
        deltaX: minX - subpathInfo.bounds.minX,
        deltaY: 0
      });
    });
  },

  alignCenterSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const targetCenterX = subpathBounds.reduce((sum, sb) => sum + sb.centerX, 0) / subpathBounds.length;
      return (subpathInfo) => ({
        deltaX: targetCenterX - subpathInfo.centerX,
        deltaY: 0
      });
    });
  },

  alignRightSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const maxX = Math.max(...subpathBounds.map(sb => sb.bounds.maxX));
      return (subpathInfo) => ({
        deltaX: maxX - subpathInfo.bounds.maxX,
        deltaY: 0
      });
    });
  },

  alignTopSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const minY = Math.min(...subpathBounds.map(sb => sb.bounds.minY));
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: minY - subpathInfo.bounds.minY
      });
    });
  },

  alignMiddleSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const targetCenterY = subpathBounds.reduce((sum, sb) => sum + sb.centerY, 0) / subpathBounds.length;
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: targetCenterY - subpathInfo.centerY
      });
    });
  },

  alignBottomSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    performSubpathAlignment(state, selectedSubpaths, (subpathBounds) => {
      const maxY = Math.max(...subpathBounds.map(sb => sb.bounds.maxY));
      return (subpathInfo) => ({
        deltaX: 0,
        deltaY: maxY - subpathInfo.bounds.maxY
      });
    });
  },

  distributeHorizontallySubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    distributeSubpathsAlongAxis(state, selectedSubpaths, 'horizontal');
  },

  distributeVerticallySubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    distributeSubpathsAlongAxis(state, selectedSubpaths, 'vertical');
  },

  // Drag actions
  startDraggingSubpaths: (canvasX: number, canvasY: number) => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];

    if (selectedSubpaths.length === 0) return;

    // Get initial positions and bounds of all selected subpaths
    const initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[];
    }> = [];

    selectedSubpaths.forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const subpaths = extractSubpaths(allCommands);

        if (subpaths[subpathIndex]) {
          const bounds = measureSubpathBounds(subpaths[subpathIndex].commands, pathData.strokeWidth ?? 1);
          initialPositions.push({
            elementId,
            subpathIndex,
            bounds,
            originalCommands: JSON.parse(JSON.stringify(subpaths[subpathIndex].commands)) // Deep copy of original commands
          });
        }
      }
    });

    set({
      draggingSubpaths: {
        isDragging: true,
        initialPositions,
        startX: canvasX,
        startY: canvasY,
        currentDeltaX: 0,
        currentDeltaY: 0
      }
    });
  },

  updateDraggingSubpaths: (canvasX: number, canvasY: number) => {
    const state = get() as FullStore;
    const draggingSubpaths = get().draggingSubpaths;

    if (!draggingSubpaths?.isDragging) return;

    const deltaX = canvasX - draggingSubpaths.startX;
    const deltaY = canvasY - draggingSubpaths.startY;

    const incrementalDeltaX = deltaX - (draggingSubpaths.currentDeltaX || 0);
    const incrementalDeltaY = deltaY - (draggingSubpaths.currentDeltaY || 0);

    // Update dragging state for tracking
    set((currentState) => {
      if (currentState.draggingSubpaths) {
        return {
          draggingSubpaths: {
            ...currentState.draggingSubpaths,
            currentX: canvasX,
            currentY: canvasY,
            deltaX,
            deltaY,
            currentDeltaX: deltaX,
            currentDeltaY: deltaY
          }
        };
      }
      return currentState;
    });

    // Apply transformations to all dragged subpaths
    // Group by elementId to avoid multiple updates to the same element
    const elementUpdates = new Map<string, {
      element: CanvasElement;
      pathData: PathData;
      subpathUpdates: Array<{ subpathIndex: number; originalCommands: Command[] }>
    }>();

    // Collect all transformations by element
    draggingSubpaths.initialPositions.forEach(({ elementId, subpathIndex, originalCommands }: { elementId: string; subpathIndex: number; originalCommands: Command[] }) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;

        if (!elementUpdates.has(elementId)) {
          elementUpdates.set(elementId, {
            element,
            pathData,
            subpathUpdates: []
          });
        }

        elementUpdates.get(elementId)!.subpathUpdates.push({
          subpathIndex,
          originalCommands
        });
      }
    });

    // Apply all transformations per element in one update
    elementUpdates.forEach(({ pathData, subpathUpdates }, elementId) => {
      const allCommands = pathData.subPaths.flat();
      const subpaths = extractSubpaths(allCommands);

      // Apply transformations to all subpaths of this element
      subpathUpdates.forEach(({ subpathIndex, originalCommands }) => {
        if (subpaths[subpathIndex]) {
          // Apply transformation to the ORIGINAL commands, not the current ones
          const transformedCommands = translateCommands(originalCommands, incrementalDeltaX, incrementalDeltaY);
          subpaths[subpathIndex] = { ...subpaths[subpathIndex], commands: transformedCommands };
        }
      });

      // Single update per element
      const newSubPaths = subpaths.map(sp => sp.commands);
      state.updateElement(elementId, {
        data: { ...pathData, subPaths: newSubPaths }
      });
    });
  },

  stopDraggingSubpaths: () => {
    set({ draggingSubpaths: null });
  },

  // Match size functions
  matchWidthToLargestSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    matchSubpathSizeToLargest(state, selectedSubpaths, 'width');
  },

  matchHeightToLargestSubpaths: () => {
    const state = get() as FullStore;
    const selectedSubpaths = get().selectedSubpaths ?? [];
    matchSubpathSizeToLargest(state, selectedSubpaths, 'height');
  },
});
