import type { StateCreator } from 'zustand';
import { extractEditablePoints, updateCommands, normalizePathCommands, extractSubpaths, adjustControlPointForAlignment, getControlPointAlignmentInfo } from '../../utils/pathParserUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import type { CanvasElement, Point, PathData, Command, SelectedCommand, PointUpdate } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { snapManager } from '../../snap/SnapManager';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { inverseMatrix, applyToPoint } from '../../utils/matrixUtils';

// Type for the full store state (needed for get() calls)
type FullCanvasState = CanvasStore;

// ===== HELPER TYPES =====
// Note: SelectedCommand and PointUpdate now come from centralized types/selection.ts

type PathElementContext = {
  element: CanvasElement;
  pathData: PathData;
  parsedCommands: Command[];
  editablePoints: Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
    anchor?: { x: number; y: number };
  }>;
};

type AlignmentStrategy = (points: PathElementContext['editablePoints']) => number;
type DistributionAxis = 'x' | 'y';

// ===== HELPER FUNCTIONS =====

/**
 * Finds the closing Z command index for a given M command
 * Returns -1 if no closing Z is found
 */
function findClosingZForMove(commands: Command[], mCommandIndex: number): number {
  // Check if the command at commandIndex is an M command
  if (commands[mCommandIndex]?.type !== 'M') return -1;

  // Look for Z commands after this M command
  for (let i = mCommandIndex + 1; i < commands.length; i++) {
    if (commands[i].type === 'Z') {
      // Check if this Z closes to our M point
      // A Z closes to the last M before it
      let lastMIndex = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (commands[j].type === 'M') {
          lastMIndex = j;
          break;
        }
      }

      if (lastMIndex === mCommandIndex) {
        return i;
      }
    } else if (commands[i].type === 'M') {
      // If we hit another M, stop looking
      break;
    }
  }

  return -1;
}

/**
 * Groups selected commands by element ID
 */
function groupSelectedCommandsByElement(selectedCommands: SelectedCommand[]): Record<string, SelectedCommand[]> {
  return selectedCommands.reduce((acc: Record<string, SelectedCommand[]>, cmd: SelectedCommand) => {
    if (!acc[cmd.elementId]) acc[cmd.elementId] = [];
    acc[cmd.elementId].push(cmd);
    return acc;
  }, {});
}

/**
 * Gets path element context including parsed data and editable points
 */
function getPathElementContext(state: CanvasStore, elementId: string): PathElementContext | null {
  const element = state.elements.find((el: CanvasElement) => el.id === elementId);
  if (!element || element.type !== 'path') return null;

  const pathData = element.data as PathData;
  const parsedCommands = pathData.subPaths.flat();
  const editablePoints = extractEditablePoints(parsedCommands);

  return {
    element,
    pathData,
    parsedCommands,
    editablePoints
  };
}

/**
 * Gets selected points from a set of commands for a specific element
 */
function getSelectedPoints(
  commands: SelectedCommand[],
  editablePoints: PathElementContext['editablePoints']
): PathElementContext['editablePoints'] {
  return editablePoints.filter((point) =>
    commands.some((cmd) =>
      cmd.commandIndex === point.commandIndex &&
      cmd.pointIndex === point.pointIndex
    )
  );
}

/**
 * Applies point updates to an element and updates the store
 */
function applyPointUpdates(
  elementId: string,
  pathData: PathData,
  parsedCommands: Command[],
  updates: PointUpdate[],
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  const updatedCommands = updateCommands(parsedCommands, updates.map(u => ({
    ...u,
    type: 'independent' as const,
    anchor: { x: u.x, y: u.y }
  })));
  const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);

  setStore((currentState) => ({
    elements: currentState.elements.map((el) => {
      if (el.id === elementId && el.type === 'path') {
        return { ...el, data: { ...pathData, subPaths: newSubPaths } };
      }
      return el;
    }) as CanvasElement[],
  }));
}

/**
 * Alignment strategies for different alignment types
 */
const alignmentStrategies = {
  left: (points: PathElementContext['editablePoints']) => Math.min(...points.map(p => p.x)),
  center: (points: PathElementContext['editablePoints']) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    return (minX + maxX) / 2;
  },
  right: (points: PathElementContext['editablePoints']) => Math.max(...points.map(p => p.x)),
  top: (points: PathElementContext['editablePoints']) => Math.min(...points.map(p => p.y)),
  middle: (points: PathElementContext['editablePoints']) => {
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    return (minY + maxY) / 2;
  },
  bottom: (points: PathElementContext['editablePoints']) => Math.max(...points.map(p => p.y))
};

/**
 * Generic alignment function that applies a strategy to selected points
 */
function applyAlignment(
  selectedCommands: SelectedCommand[],
  strategy: AlignmentStrategy,
  axis: 'x' | 'y',
  state: CanvasStore,
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  if (selectedCommands.length < 2) return;

  const commandsByElement = groupSelectedCommandsByElement(selectedCommands);

  Object.entries(commandsByElement).forEach(([elementId, commands]) => {
    const context = getPathElementContext(state, elementId);
    if (!context || commands.length < 2) return;

    const selectedPoints = getSelectedPoints(commands, context.editablePoints);
    if (selectedPoints.length < 2) return;

    const newValue = strategy(selectedPoints);
    const updatedPoints: PointUpdate[] = selectedPoints.map(point => ({
      ...point,
      [axis]: newValue
    }));

    applyPointUpdates(elementId, context.pathData, context.parsedCommands, updatedPoints, setStore);
  });
}

/**
 * Collects all selected points across elements with their positions
 */
function collectAllSelectedPoints(
  selectedCommands: SelectedCommand[],
  state: CanvasStore
): Array<{
  elementId: string;
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
}> {
  const commandsByElement = groupSelectedCommandsByElement(selectedCommands);
  const allSelectedPoints: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
  }> = [];

  Object.entries(commandsByElement).forEach(([elementId, commands]) => {
    const context = getPathElementContext(state, elementId);
    if (!context) return;

    commands.forEach((cmd) => {
      const point = context.editablePoints.find((p) =>
        p.commandIndex === cmd.commandIndex &&
        p.pointIndex === cmd.pointIndex
      );

      if (point) {
        allSelectedPoints.push({
          elementId: cmd.elementId,
          commandIndex: cmd.commandIndex,
          pointIndex: cmd.pointIndex,
          x: point.x,
          y: point.y
        });
      }
    });
  });

  return allSelectedPoints;
}

/**
 * Generic distribution function for horizontal and vertical distribution
 */
function applyDistribution(
  selectedCommands: SelectedCommand[],
  axis: DistributionAxis,
  state: CanvasStore,
  setStore: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
): void {
  if (selectedCommands.length < 3) return;

  const allSelectedPoints = collectAllSelectedPoints(selectedCommands, state);
  if (allSelectedPoints.length < 3) return;

  // Sort by current position on the specified axis
  allSelectedPoints.sort((a, b) => a[axis] - b[axis]);

  // Calculate distribution
  const firstPoint = allSelectedPoints[0][axis];
  const lastPoint = allSelectedPoints[allSelectedPoints.length - 1][axis];
  const totalDistance = lastPoint - firstPoint;
  const spacing = totalDistance / (allSelectedPoints.length - 1);

  // Group updates by element for efficiency
  const elementUpdates = new Map<string, PointUpdate[]>();

  allSelectedPoints.forEach((pointInfo, index) => {
    if (index === 0 || index === allSelectedPoints.length - 1) {
      // Keep first and last points in place
      return;
    }

    const newValue = firstPoint + (index * spacing);

    if (!elementUpdates.has(pointInfo.elementId)) {
      elementUpdates.set(pointInfo.elementId, []);
    }

    elementUpdates.get(pointInfo.elementId)!.push({
      commandIndex: pointInfo.commandIndex,
      pointIndex: pointInfo.pointIndex,
      x: axis === 'x' ? newValue : pointInfo.x,
      y: axis === 'y' ? newValue : pointInfo.y,
      isControl: false
    });
  });

  // Apply updates to each element
  elementUpdates.forEach((updates, elementId) => {
    const context = getPathElementContext(state, elementId);
    if (!context) return;

    applyPointUpdates(elementId, context.pathData, context.parsedCommands, updates, setStore);
  });
}

// ===== MAIN INTERFACE =====

export interface EditPluginSlice {
  // State
  editingPoint: {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  draggingSelection: {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
  } | null;
  controlPointAlignment: {
    enabled: boolean;
  };


  // Actions
  setEditingPoint: (point: { elementId: string; commandIndex: number; pointIndex: number } | null) => void;
  startDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  updateDraggingPoint: (x: number, y: number) => { x: number; y: number };
  stopDraggingPoint: () => void;
  emergencyCleanupDrag: () => void;
  selectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
  getPointsInRange: (elementId: string, startCommandIndex: number, startPointIndex: number, endCommandIndex: number, endPointIndex: number) => Array<{ elementId: string; commandIndex: number; pointIndex: number }>;
  clearSelectedCommands: () => void;
  deleteSelectedCommands: () => void;
  deleteZCommandForMPoint: (elementId: string, commandIndex: number) => void;
  convertZToLineForMPoint: (elementId: string, commandIndex: number) => void;
  addZCommandToSubpath: (elementId: string, commandIndex: number) => void;
  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => void;
  convertCommandType: (elementId: string, commandIndex: number) => void;
  cutSubpathAtPoint: (elementId: string, commandIndex: number, pointIndex: number) => void;
  alignLeftCommands: () => void;
  alignCenterCommands: () => void;
  alignRightCommands: () => void;
  alignTopCommands: () => void;
  alignMiddleCommands: () => void;
  alignBottomCommands: () => void;
  distributeHorizontallyCommands: () => void;
  distributeVerticallyCommands: () => void;
  isWorkingWithSubpaths: () => boolean;
  getFilteredEditablePoints: (elementId: string) => Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => import('../../types').ControlPointInfo | null;
  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../types').ControlPointType) => void;
  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => void;
  moveSelectedPoints: (deltaX: number, deltaY: number) => void;
}

// Track last deletion time to prevent double-deletion
let lastDeletionTime = 0;
let isDeletingInProgress = false;
const DELETION_DEBOUNCE_MS = 200;

export const createEditPluginSlice: StateCreator<EditPluginSlice, [], [], EditPluginSlice> = (set, get) => ({
  // Initial state
  editingPoint: null,
  selectedCommands: [],
  draggingSelection: null,
  controlPointAlignment: {
    enabled: true,
  },

  // Actions
  setEditingPoint: (point) => {
    set({ editingPoint: point ? { ...point, isDragging: false, offsetX: 0, offsetY: 0 } : null });
  },

  startDraggingPoint: (elementId, commandIndex, pointIndex, offsetX, offsetY) => {
    const state = get() as unknown as FullCanvasState;

    // Check if the point being dragged is in the selection
    const isSelected = state.selectedCommands?.some((cmd: { elementId: string; commandIndex: number; pointIndex: number }) =>
      cmd.elementId === elementId &&
      cmd.commandIndex === commandIndex &&
      cmd.pointIndex === pointIndex
    ) ?? false;

    // If the point is not selected, select it first (single selection)
    if (!isSelected) {
      set({ selectedCommands: [{ elementId, commandIndex, pointIndex }] });
    }

    // Now determine the drag type based on current selection
    const currentState = get() as unknown as FullCanvasState;
    const currentIsSelected = currentState.selectedCommands?.some((cmd: { elementId: string; commandIndex: number; pointIndex: number }) =>
      cmd.elementId === elementId &&
      cmd.commandIndex === commandIndex &&
      cmd.pointIndex === pointIndex
    ) ?? false;

    if (currentIsSelected && (currentState.selectedCommands?.length ?? 0) > 1) {
      // Multiple points selected - prepare for group drag
      const initialPositions: Array<{
        elementId: string;
        commandIndex: number;
        pointIndex: number;
        x: number;
        y: number;
      }> = [];

      // Get initial positions of all selected points
      currentState.selectedCommands?.forEach((cmd: { elementId: string; commandIndex: number; pointIndex: number; }) => {
        const element = state.elements.find((el) => el.id === cmd.elementId);
        if (element && element.type === 'path') {
          const pathData = element.data as PathData;
          const commands = pathData.subPaths.flat();
          const points = extractEditablePoints(commands);

          const point = points.find(p =>
            p.commandIndex === cmd.commandIndex &&
            p.pointIndex === cmd.pointIndex
          );

          if (point) {
            initialPositions.push({
              elementId: cmd.elementId,
              commandIndex: cmd.commandIndex,
              pointIndex: cmd.pointIndex,
              x: point.x,
              y: point.y
            });
          }
        }
      });

      set({
        draggingSelection: {
          isDragging: true,
          draggedPoint: { elementId, commandIndex, pointIndex },
          initialPositions,
          startX: offsetX,
          startY: offsetY
        }
      });
    } else {
      // Single point drag
      set({
        editingPoint: {
          elementId,
          commandIndex,
          pointIndex,
          isDragging: true,
          offsetX,
          offsetY
        },
        draggingSelection: null
      });
    }
  },

  updateDraggingPoint: (x, y) => {
    const state = get() as unknown as FullCanvasState;

    // Apply object snap if enabled
    let snappedX = x;
    let snappedY = y;

    if (state.objectSnap?.enabled) {
      // Get IDs of elements being edited to exclude from snap
      const excludeElementIds: string[] = [];

      // Build dragPointInfo for precise point exclusion
      let dragPointInfo: { elementId: string; subpathIndex: number; pointIndex: number; commandIndex?: number } | null = null;

      if (state.draggingSelection?.isDragging) {
        // Collect all element IDs from dragging selection
        state.draggingSelection.initialPositions.forEach((pos: { elementId: string; commandIndex: number; pointIndex: number; x: number; y: number }) => {
          if (!excludeElementIds.includes(pos.elementId)) {
            excludeElementIds.push(pos.elementId);
          }
        });
        // For group drag, use the first point as the reference (or the draggedPoint if available)
        if (state.draggingSelection.draggedPoint) {
          dragPointInfo = {
            elementId: state.draggingSelection.draggedPoint.elementId,
            subpathIndex: 0,
            pointIndex: state.draggingSelection.draggedPoint.commandIndex,
          };
        }
      } else if (state.editingPoint?.isDragging) {
        // Don't exclude the current element to allow self-snapping
        // excludeElementIds.push(state.editingPoint.elementId);
        dragPointInfo = {
          elementId: state.editingPoint.elementId,
          subpathIndex: 0,
          pointIndex: state.editingPoint.commandIndex,
          commandIndex: state.editingPoint.commandIndex,
        };
      }

      // Apply object snap using centralized SnapManager
      try {
        // Use centralized snapManager
        const snapContext = {
          viewport: state.viewport,
          canvasSize: { width: 0, height: 0 },
          activePlugin: state.activePlugin,
          selectedIds: state.selectedIds ?? [],
          dragPointInfo,
        };

        const result = snapManager.snap({ x, y }, snapContext);
        if (result && result.snapPoints.length > 0) {
          snappedX = result.snappedPoint.x;
          snappedY = result.snappedPoint.y;

          // Update only the current snap point for visualization
          // Don't replace availableSnapPoints - those are managed separately by ObjectSnap
          if (state.updateObjectSnapState) {
            state.updateObjectSnapState({
              currentSnapPoint: result.snapPoints[0],
            });
          }
        } else if (state.clearCurrentSnapPoint) {
          state.clearCurrentSnapPoint();
        }
      } catch (error) {
        console.error('Error applying object snap:', error);
      }
    }

    if (state.draggingSelection?.isDragging) {
      // Handle group drag of selected points - but don't update path data here anymore
      // The path updates will be handled directly in the renderer for real-time feedback
      const deltaX = snappedX - state.draggingSelection.startX;
      const deltaY = snappedY - state.draggingSelection.startY;

      // Just update the dragging selection state for tracking
      set((currentState) => ({
        draggingSelection: currentState.draggingSelection ? {
          ...currentState.draggingSelection,
          currentX: snappedX,
          currentY: snappedY,
          deltaX,
          deltaY
        } : null
      }));
    } else if (state.editingPoint && state.editingPoint.isDragging) {
      // Handle single point drag - also handled in renderer now
      set((currentState) => ({
        editingPoint: {
          ...currentState.editingPoint!,
          offsetX: snappedX,
          offsetY: snappedY
        }
      }));
    }

    // Return the snapped coordinates
    return { x: snappedX, y: snappedY };
  },

  stopDraggingPoint: () => {
    set((state) => {
      // Emergency cleanup - ensure all drag states are cleared
      return {
        ...state,
        editingPoint: state.editingPoint ? {
          ...state.editingPoint,
          isDragging: false
        } : null,
        draggingSelection: null
      };
    });
  },

  // Emergency cleanup method
  emergencyCleanupDrag: () => {
    set((state) => ({
      ...state,
      editingPoint: null,
      draggingSelection: null
    }));
  },

  // Helper function to get points between two points in the same subpath
  getPointsInRange: (elementId: string, startCommandIndex: number, startPointIndex: number, endCommandIndex: number, endPointIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as PathData;
    const subpaths = pathData.subPaths;

    // Calculate start and end indices for each subpath
    const subpathInfos = subpaths.map((subpath, index) => {
      const startIndex = subpaths.slice(0, index).reduce((sum, sp) => sum + sp.length, 0);
      const endIndex = startIndex + subpath.length - 1;
      return { subpath, startIndex, endIndex };
    });

    // Find which subpath the start point belongs to
    let startSubpathIndex = -1;
    for (let i = 0; i < subpathInfos.length; i++) {
      const { startIndex, endIndex } = subpathInfos[i];
      if (startCommandIndex >= startIndex && startCommandIndex <= endIndex) {
        startSubpathIndex = i;
        break;
      }
    }

    // Find which subpath the end point belongs to
    let endSubpathIndex = -1;
    for (let i = 0; i < subpathInfos.length; i++) {
      const { startIndex, endIndex } = subpathInfos[i];
      if (endCommandIndex >= startIndex && endCommandIndex <= endIndex) {
        endSubpathIndex = i;
        break;
      }
    }

    // Only select range if both points are in the same subpath
    if (startSubpathIndex !== endSubpathIndex || startSubpathIndex === -1) return [];

    const { subpath, startIndex } = subpathInfos[startSubpathIndex];
    const allPoints = extractEditablePoints(subpath);

    // Adjust command indices to be relative to the full path
    const adjustedPoints = allPoints.map(p => ({
      ...p,
      commandIndex: p.commandIndex + startIndex
    }));

    // Find indices in the subpath's point array
    const startPointGlobalIndex = adjustedPoints.findIndex(p =>
      p.commandIndex === startCommandIndex && p.pointIndex === startPointIndex
    );
    const endPointGlobalIndex = adjustedPoints.findIndex(p =>
      p.commandIndex === endCommandIndex && p.pointIndex === endPointIndex
    );

    if (startPointGlobalIndex === -1 || endPointGlobalIndex === -1) return [];

    // Get all points between the two indices (inclusive)
    const minIndex = Math.min(startPointGlobalIndex, endPointGlobalIndex);
    const maxIndex = Math.max(startPointGlobalIndex, endPointGlobalIndex);

    const pointsInRange = adjustedPoints.slice(minIndex, maxIndex + 1);

    return pointsInRange.map(p => ({
      elementId,
      commandIndex: p.commandIndex,
      pointIndex: p.pointIndex
    }));
  },

  selectCommand: (command, multiSelect = false) => {
    set((state) => {
      // Get filtered points to check if this command is visible/selectable
      const fullState = get() as unknown as FullCanvasState;
      const filteredPoints = fullState.getFilteredEditablePoints?.(command.elementId) ?? [];

      // Check if the command is in the filtered points (visible in current mode)
      const isCommandVisible = filteredPoints.some(
        (p: { commandIndex: number; pointIndex: number }) => p.commandIndex === command.commandIndex && p.pointIndex === command.pointIndex
      );

      // If command is not visible, don't select it
      if (!isCommandVisible) {
        return state;
      }

      const isAlreadySelected = state.selectedCommands.some(
        (c) => c.elementId === command.elementId &&
          c.commandIndex === command.commandIndex &&
          c.pointIndex === command.pointIndex
      );

      let newSelectedCommands;
      if (multiSelect) {
        if (isAlreadySelected) {
          newSelectedCommands = state.selectedCommands.filter(
            (c) => !(c.elementId === command.elementId &&
              c.commandIndex === command.commandIndex &&
              c.pointIndex === command.pointIndex)
          );
        } else {
          // Check if there's already a selection in the same element for range selection
          const existingSelectionInElement = state.selectedCommands.filter(
            (c) => c.elementId === command.elementId
          );

          if (existingSelectionInElement.length === 1) {
            // Do range selection: select all points between the existing selection and new point
            const existingCmd = existingSelectionInElement[0];
            const pointsInRange = get().getPointsInRange(
              command.elementId,
              existingCmd.commandIndex,
              existingCmd.pointIndex,
              command.commandIndex,
              command.pointIndex
            );

            // Filter points in range to only include visible ones
            const visiblePointsInRange = pointsInRange.filter(p =>
              filteredPoints.some((fp: { commandIndex: number; pointIndex: number }) =>
                fp.commandIndex === p.commandIndex && fp.pointIndex === p.pointIndex
              )
            );

            newSelectedCommands = [...state.selectedCommands, ...visiblePointsInRange];
          } else {
            // Multiple or no existing selection in element, just add the single command
            newSelectedCommands = [...state.selectedCommands, command];
          }
        }
      } else {
        newSelectedCommands = isAlreadySelected ? [] : [command];
      }

      return {
        selectedCommands: newSelectedCommands
      };
    });

    // Set active plugin to 'edit' when selecting commands
    const currentState = get() as unknown as FullCanvasState;
    if (currentState.activePlugin !== 'edit') {
      currentState.setActivePlugin('edit');
    }
  },

  clearSelectedCommands: () => {
    set({ selectedCommands: [] });
  },

  deleteSelectedCommands: () => {
    const now = Date.now();

    // Double protection: check both flag and timestamp
    if (isDeletingInProgress || now - lastDeletionTime < DELETION_DEBOUNCE_MS) {
      return;
    }

    isDeletingInProgress = true;
    lastDeletionTime = now;

    const state = get() as unknown as FullCanvasState;
    const selectedCommands = state.selectedCommands;

    if (!selectedCommands || selectedCommands.length === 0) {
      isDeletingInProgress = false;
      return;
    }

    // Check if only one point is selected to enable auto-selection of next point
    const isSinglePointSelected = selectedCommands.length === 1;
    const singleSelectedCommand = isSinglePointSelected ? selectedCommands[0] : null;

    // Group commands by elementId using helper
    const commandsByElement = groupSelectedCommandsByElement(selectedCommands);

    // Variable to track the next point coordinates to select (if applicable)
    let nextPointCoordinates: { x: number; y: number; elementId: string } | null = null;

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el: CanvasElement) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = pathData.subPaths.flat();
        const allPoints = extractEditablePoints(parsedCommands);

        // Find selected points
        const selectedPoints = allPoints.filter((point) =>
          commands.some((cmd) =>
            cmd.commandIndex === point.commandIndex &&
            cmd.pointIndex === point.pointIndex
          )
        );

        // If single point selected, find the next available point before deletion
        if (isSinglePointSelected && singleSelectedCommand && singleSelectedCommand.elementId === elementId) {
          const currentPointIndex = allPoints.findIndex(p =>
            p.commandIndex === singleSelectedCommand.commandIndex &&
            p.pointIndex === singleSelectedCommand.pointIndex
          );

          if (currentPointIndex !== -1) {
            // Try to select the next command point (not control points)
            let nextIndex = currentPointIndex + 1;

            // Look for the next command point that won't be deleted
            while (nextIndex < allPoints.length) {
              const candidatePoint = allPoints[nextIndex];

              // Skip control points - only select command points
              if (candidatePoint.isControl) {
                nextIndex++;
                continue;
              }

              // Skip if this point is about to be deleted
              const willBeDeleted = selectedPoints.some((sp: { commandIndex: number; pointIndex: number }) =>
                sp.commandIndex === candidatePoint.commandIndex &&
                sp.pointIndex === candidatePoint.pointIndex
              );

              if (!willBeDeleted) {
                // Found the next command point - save its coordinates
                nextPointCoordinates = {
                  x: candidatePoint.x,
                  y: candidatePoint.y,
                  elementId
                };
                break;
              }
              nextIndex++;
            }

            // If no next point found, try previous command point
            if (!nextPointCoordinates) {
              let prevIndex = currentPointIndex - 1;
              while (prevIndex >= 0) {
                const candidatePoint = allPoints[prevIndex];

                // Skip control points - only select command points
                if (candidatePoint.isControl) {
                  prevIndex--;
                  continue;
                }

                const willBeDeleted = selectedPoints.some((sp: { commandIndex: number; pointIndex: number }) =>
                  sp.commandIndex === candidatePoint.commandIndex &&
                  sp.pointIndex === candidatePoint.pointIndex
                );

                if (!willBeDeleted) {
                  nextPointCoordinates = {
                    x: candidatePoint.x,
                    y: candidatePoint.y,
                    elementId
                  };
                  break;
                }
                prevIndex--;
              }
            }
          }
        }

        if (selectedPoints.length > 0) {
          // Group selected points by command index to handle multiple selections per command
          const pointsByCommand = new Map<number, Set<number>>();
          selectedPoints.forEach(point => {
            if (!pointsByCommand.has(point.commandIndex)) {
              pointsByCommand.set(point.commandIndex, new Set());
            }
            pointsByCommand.get(point.commandIndex)!.add(point.pointIndex);
          });

          // Sort command indices in reverse order to maintain indices during deletion
          const sortedCommandIndices = Array.from(pointsByCommand.keys()).sort((a, b) => b - a);

          let updatedCommands = [...parsedCommands];

          // Process each command with selected points
          sortedCommandIndices.forEach(cmdIndex => {
            const selectedPointIndices = pointsByCommand.get(cmdIndex)!;
            const command = updatedCommands[cmdIndex];

            if (!command) return;

            // Handle different command types
            if (command.type === 'M') {
              // For M commands, delete the entire command
              if (cmdIndex < updatedCommands.length - 1) {
                // Find the next non-Z command to convert to M
                let nextNonZIndex = cmdIndex + 1;
                while (nextNonZIndex < updatedCommands.length && updatedCommands[nextNonZIndex]?.type === 'Z') {
                  nextNonZIndex++;
                }

                if (nextNonZIndex < updatedCommands.length) {
                  const nextCommand = updatedCommands[nextNonZIndex];
                  // Convert to M using the end position
                  updatedCommands[nextNonZIndex] = {
                    type: 'M' as const,
                    position: (nextCommand as Command & { position: Point }).position
                  };
                }
              }
              // Remove the M command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'L') {
              // For L commands, remove the entire command
              updatedCommands.splice(cmdIndex, 1);
            } else if (command.type === 'C') {
              // For C commands, check which points are selected
              const hasControlPoint = selectedPointIndices.has(0) || selectedPointIndices.has(1);
              const hasEndPoint = selectedPointIndices.has(2);

              if (hasEndPoint) {
                // If end point is selected (regardless of control points), remove entire command
                updatedCommands.splice(cmdIndex, 1);
              } else if (hasControlPoint) {
                // Only control points selected, convert to L command
                updatedCommands[cmdIndex] = {
                  type: 'L' as const,
                  position: command.position // Keep only the end point
                };
              }
            } else if (command.type === 'Z') {
              // Can't delete Z command directly, but if it's the only command left, handle it
              if (updatedCommands.length === 1) {
                // If only Z is left, we'll handle this below
              }
            }
          });

          // Filter out any null commands and clean up
          updatedCommands = updatedCommands.filter(cmd => cmd !== null);

          // Normalize the commands to remove duplicates and clean up
          const normalizedCommands = normalizePathCommands(updatedCommands);

          // Check if the path is now empty after normalization
          if (normalizedCommands.length === 0) {
            // Delete the entire element
            (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
              ...currentState,
              elements: currentState.elements.filter((el) => el.id !== elementId)
            }));
            // Clear next point selection since element is deleted
            nextPointCoordinates = null;
            return;
          }

          // Reconstruct path string from normalized commands
          const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

          // Update the element with the new path
          (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
            ...currentState,
            elements: currentState.elements.map((el) => {
              if (el.id === elementId && el.type === 'path') {
                return { ...el, data: { ...pathData, subPaths: newSubPaths } };
              }
              return el;
            }) as CanvasElement[],
          }));
        }
      }
    });

    // Find and select the next point by coordinates after all deletions
    // IMPORTANT: Get fresh state after all updates
    const updatedState = get() as unknown as FullCanvasState;
    let nextPointToSelect: SelectedCommand | null = null;

    if (nextPointCoordinates) {
      const coords: { x: number; y: number; elementId: string } = nextPointCoordinates;
      const element = updatedState.elements.find((el) => el.id === coords.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const parsedCommands = pathData.subPaths.flat();
        const allPoints = extractEditablePoints(parsedCommands);

        // Find point with matching coordinates (with small tolerance for floating point)
        const TOLERANCE = 0.001;
        const foundPoint = allPoints.find(p =>
          Math.abs(p.x - coords.x) < TOLERANCE &&
          Math.abs(p.y - coords.y) < TOLERANCE
        );

        if (foundPoint) {
          nextPointToSelect = {
            elementId: coords.elementId,
            commandIndex: foundPoint.commandIndex,
            pointIndex: foundPoint.pointIndex
          };
        } else if (allPoints.length > 0) {
          // Fallback: select the first available non-control point
          const firstNonControl = allPoints.find(p => !p.isControl) || allPoints[0];
          nextPointToSelect = {
            elementId: coords.elementId,
            commandIndex: firstNonControl.commandIndex,
            pointIndex: firstNonControl.pointIndex
          };
        }
      }
    }

    // Set selection based on whether we have a next point to select
    if (nextPointToSelect) {
      set({ selectedCommands: [nextPointToSelect] });
    } else {
      // Clear selection after processing
      set({ selectedCommands: [] });
    }

    // Reset the deletion flag
    isDeletingInProgress = false;
  },

  alignLeftCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.left, 'x', state, setStore);
  },

  alignCenterCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.center, 'x', state, setStore);
  },

  alignRightCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.right, 'x', state, setStore);
  },

  alignTopCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.top, 'y', state, setStore);
  },

  alignMiddleCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.middle, 'y', state, setStore);
  },

  alignBottomCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyAlignment(state.selectedCommands ?? [], alignmentStrategies.bottom, 'y', state, setStore);
  },

  distributeHorizontallyCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyDistribution(state.selectedCommands ?? [], 'x', state, setStore);
  },

  distributeVerticallyCommands: () => {
    const state = get() as unknown as FullCanvasState;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    applyDistribution(state.selectedCommands ?? [], 'y', state, setStore);
  },

  // Check if edit should work with subpaths instead of all points
  isWorkingWithSubpaths: () => {
    const state = get() as unknown as FullCanvasState;
    return (state.selectedSubpaths?.length ?? 0) > 0;
  },

  // Get filtered editable points - either from selected subpaths or all points
  getFilteredEditablePoints: (elementId: string) => {
    const state = get() as unknown as FullCanvasState;
    const hasSelectedSubpaths = state.selectedSubpaths && state.selectedSubpaths.length > 0;

    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') return [];

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const allPoints = extractEditablePoints(commands);

    if (!hasSelectedSubpaths) {
      // Normal mode: return all points
      return allPoints;
    }

    // Subpath mode: filter points to only include those from selected subpaths
    const selectedSubpaths = (state.selectedSubpaths ?? []).filter((sp: { elementId: string; subpathIndex: number }) => sp.elementId === elementId);
    if (selectedSubpaths.length === 0) return [];

    const subpaths = extractSubpaths(commands);
    const filteredPoints: typeof allPoints = [];

    selectedSubpaths.forEach((selected: { subpathIndex: number }) => {
      const subpathData = subpaths[selected.subpathIndex];
      if (subpathData) {
        // Include points that fall within this subpath's command range
        const pointsInSubpath = allPoints.filter(point =>
          point.commandIndex >= subpathData.startIndex &&
          point.commandIndex <= subpathData.endIndex
        );
        filteredPoints.push(...pointsInSubpath);
      }
    });

    return filteredPoints;
  },

  getControlPointInfo: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return null;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Calculate alignment info on-demand
    const alignmentInfo = getControlPointAlignmentInfo(commands, points, commandIndex, pointIndex);

    if (!alignmentInfo) return null;

    return {
      commandIndex,
      pointIndex,
      anchor: alignmentInfo.anchor,
      isControl: true,
      // Include type and pairing info from alignment calculation
      type: alignmentInfo.type,
      pairedCommandIndex: alignmentInfo.pairedCommandIndex,
      pairedPointIndex: alignmentInfo.pairedPointIndex
    } as import('../../types').ControlPointInfo & { type: import('../../types').ControlPointType; pairedCommandIndex?: number; pairedPointIndex?: number };
  },

  setControlPointAlignmentType: (elementId: string, commandIndex1: number, pointIndex1: number, commandIndex2: number, pointIndex2: number, type: import('../../types').ControlPointType) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Find the control points
    const point1 = points.find(p => p.commandIndex === commandIndex1 && p.pointIndex === pointIndex1);
    const point2 = points.find(p => p.commandIndex === commandIndex2 && p.pointIndex === pointIndex2);

    if (!point1 || !point2 || !point1.isControl || !point2.isControl) return;

    // Verify they share the same anchor (they should be paired)
    const tolerance = 0.1;
    const anchorDistance = Math.sqrt(
      Math.pow(point1.anchor.x - point2.anchor.x, 2) +
      Math.pow(point1.anchor.y - point2.anchor.y, 2)
    );

    if (anchorDistance >= tolerance) return;

    const sharedAnchor = point1.anchor;

    // Calculate the new position for point1 based on the alignment type
    const newPoint1Position = adjustControlPointForAlignment(
      { x: point1.x, y: point1.y },
      { x: point2.x, y: point2.y },
      sharedAnchor,
      type
    );

    // Update point1 with new position
    point1.x = newPoint1Position.x;
    point1.y = newPoint1Position.y;

    // Update the path with modified points
    const newCommands = updateCommands(commands, [point1]);
    const newSubPaths = extractSubpaths(newCommands).map(s => s.commands);

    (get() as unknown as FullCanvasState).updateElement(elementId, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  },

  applyControlPointAlignment: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    // Find the control point that was moved
    const movedPoint = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);
    if (!movedPoint || !movedPoint.isControl) return;

    // Get the alignment info for this point (calculated on-demand)
    const alignmentInfo = getControlPointAlignmentInfo(commands, points, commandIndex, pointIndex);

    if (!alignmentInfo || alignmentInfo.type === 'independent') return;

    // Find the paired point
    const pairedPoint = points.find(p =>
      p.commandIndex === alignmentInfo.pairedCommandIndex &&
      p.pointIndex === alignmentInfo.pairedPointIndex
    );
    if (!pairedPoint) return;

    // Calculate the new position for the paired point based on alignment type
    const sharedAnchor = alignmentInfo.anchor;
    const newVector = {
      x: newX - sharedAnchor.x,
      y: newY - sharedAnchor.y
    };

    let newPairedX: number;
    let newPairedY: number;

    if (alignmentInfo.type === 'mirrored') {
      // Mirror the movement
      const magnitude = Math.sqrt(newVector.x * newVector.x + newVector.y * newVector.y);
      const unitVector = magnitude > 0 ? {
        x: newVector.x / magnitude,
        y: newVector.y / magnitude
      } : { x: 0, y: 0 };



      newPairedX = sharedAnchor.x + (-unitVector.x * magnitude);
      newPairedY = sharedAnchor.y + (-unitVector.y * magnitude);
    } else { // aligned
      // Maintain opposite direction with same magnitude
      const magnitude = Math.sqrt(newVector.x * newVector.x + newVector.y * newVector.y);
      const unitVector = magnitude > 0 ? {
        x: newVector.x / magnitude,
        y: newVector.y / magnitude
      } : { x: 0, y: 0 };

      newPairedX = sharedAnchor.x + (-unitVector.x * magnitude);
      newPairedY = sharedAnchor.y + (-unitVector.y * magnitude);
    }

    // Update the paired point position
    pairedPoint.x = formatToPrecision(newPairedX, PATH_DECIMAL_PRECISION);
    pairedPoint.y = formatToPrecision(newPairedY, PATH_DECIMAL_PRECISION);

    // Update the path
    const updatedCommands = updateCommands(commands, [pairedPoint]);
    const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);
    (get() as unknown as FullCanvasState).updateElement(elementId, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  },

  finalizePointMove: (elementId: string, commandIndex: number, pointIndex: number, newX: number, newY: number) => {
    // Apply control point alignment if this point has alignment configured
    get().applyControlPointAlignment(elementId, commandIndex, pointIndex, newX, newY);
  },

  moveSelectedPoints: (deltaX: number, deltaY: number) => {
    const state = get() as unknown as FullCanvasState;
    const selectedCommands = get().selectedCommands;
    const precision = state.settings.keyboardMovementPrecision;

    if (selectedCommands.length === 0) return;

    // Group by elementId
    const commandsByElement = selectedCommands.reduce((acc, cmd) => {
      if (!acc[cmd.elementId]) {
        acc[cmd.elementId] = [];
      }
      acc[cmd.elementId].push(cmd);
      return acc;
    }, {} as Record<string, typeof selectedCommands>);

    // Process each element
    Object.entries(commandsByElement).forEach(([elementId, commands]) => {
      const element = state.elements.find((el) => el.id === elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const allCommands = pathData.subPaths.flat();
        const newCommands = [...allCommands];

        // Transform global delta to local coordinates for this element
        // This handles the case when the path is inside a group with transformations
        const parentMatrix = getParentCumulativeTransformMatrix(element, state.elements);
        const invParent = inverseMatrix(parentMatrix);
        
        let localDeltaX = deltaX;
        let localDeltaY = deltaY;
        
        if (invParent) {
          // Transform delta by applying inverse to both origin and delta point
          const p0 = applyToPoint(invParent, { x: 0, y: 0 });
          const p1 = applyToPoint(invParent, { x: deltaX, y: deltaY });
          localDeltaX = p1.x - p0.x;
          localDeltaY = p1.y - p0.y;
        }

        commands.forEach(({ commandIndex, pointIndex }) => {
          if (commandIndex < newCommands.length) {
            const command = newCommands[commandIndex];
            if (command.type === 'M' || command.type === 'L') {
              if (pointIndex === 0) {
                command.position.x = formatToPrecision(command.position.x + localDeltaX, precision);
                command.position.y = formatToPrecision(command.position.y + localDeltaY, precision);
              }
            } else if (command.type === 'C') {
              if (pointIndex === 0) {
                command.controlPoint1.x = formatToPrecision(command.controlPoint1.x + localDeltaX, precision);
                command.controlPoint1.y = formatToPrecision(command.controlPoint1.y + localDeltaY, precision);
              } else if (pointIndex === 1) {
                command.controlPoint2.x = formatToPrecision(command.controlPoint2.x + localDeltaX, precision);
                command.controlPoint2.y = formatToPrecision(command.controlPoint2.y + localDeltaY, precision);
              } else if (pointIndex === 2) {
                command.position.x = formatToPrecision(command.position.x + localDeltaX, precision);
                command.position.y = formatToPrecision(command.position.y + localDeltaY, precision);
              }
            }
          }
        });

        // Reconstruct subPaths
        const extractedSubpaths = extractSubpaths(newCommands);
        const newSubPaths = extractedSubpaths.map(subpath => subpath.commands);
        state.updateElement(elementId, {
          data: { ...pathData, subPaths: newSubPaths }
        });
      }
    });
  },

  deleteZCommandForMPoint: (elementId: string, commandIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const zCommandIndex = findClosingZForMove(commands, commandIndex);

    if (zCommandIndex !== -1) {
      // Remove the Z command
      const updatedCommands = commands.filter((_, index) => index !== zCommandIndex);

      // Normalize and reconstruct path
      const normalizedCommands = normalizePathCommands(updatedCommands);
      const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

      // Update the element
      (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
        ...currentState,
        elements: currentState.elements.map((el) => {
          if (el.id === elementId && el.type === 'path') {
            return { ...el, data: { ...pathData, subPaths: newSubPaths } };
          }
          return el;
        }) as CanvasElement[],
      }));
    }
  },

  convertZToLineForMPoint: (elementId: string, commandIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const zCommandIndex = findClosingZForMove(commands, commandIndex);

    if (zCommandIndex !== -1) {
      // Replace the Z command with an L command to the M position
      const mCommand = commands[commandIndex];
      const updatedCommands = [...commands];

      // Type guard to ensure M command has position
      if (mCommand.type === 'M' && 'position' in mCommand) {
        updatedCommands[zCommandIndex] = {
          type: 'L' as const,
          position: mCommand.position
        };

        // Normalize and reconstruct path
        const normalizedCommands = normalizePathCommands(updatedCommands);
        const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

        // Update the element
        (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
          ...currentState,
          elements: currentState.elements.map((el) => {
            if (el.id === elementId && el.type === 'path') {
              return { ...el, data: { ...pathData, subPaths: newSubPaths } };
            }
            return el;
          }) as CanvasElement[],
        }));
      }
    }
  },

  addZCommandToSubpath: (elementId: string, commandIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const command = commands[commandIndex];

    if (!command || (command.type !== 'L' && command.type !== 'C')) return;

    // Find the M command for this subpath
    let subpathMIndex = -1;
    for (let i = commandIndex - 1; i >= 0; i--) {
      if (commands[i].type === 'M') {
        subpathMIndex = i;
        break;
      }
    }

    if (subpathMIndex === -1) return;

    // Find the end of the current subpath
    let subpathEndIndex = commandIndex;
    for (let i = commandIndex + 1; i < commands.length; i++) {
      if (commands[i].type === 'M' || commands[i].type === 'Z') {
        break;
      }
      subpathEndIndex = i;
    }

    // Check if already has a Z command
    if (subpathEndIndex < commands.length - 1 && commands[subpathEndIndex + 1].type === 'Z') {
      return; // Already has Z command
    }

    // Add Z command after the last command of the subpath
    const updatedCommands = [
      ...commands.slice(0, subpathEndIndex + 1),
      { type: 'Z' as const },
      ...commands.slice(subpathEndIndex + 1)
    ];

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);
    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));
  },

  moveToM: (elementId: string, commandIndex: number, pointIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    // Check if the command exists and is L or C
    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return;

    // Check if this is the last point of the command
    let pointsLength = 0;
    if (command.type === 'L') pointsLength = 1;
    else if (command.type === 'C') pointsLength = 3;
    const isLastPoint = pointIndex === pointsLength - 1;
    if (!isLastPoint) return;

    // Check if this is the last command in the path or before a Z/M
    const isLastCommandInSubpath = commandIndex === commands.length - 1 ||
      commands[commandIndex + 1].type === 'M' ||
      commands[commandIndex + 1].type === 'Z';

    if (!isLastCommandInSubpath) return;

    // Find the M command for this subpath (the last M before this command)
    let subpathMIndex = -1;
    for (let i = commandIndex - 1; i >= 0; i--) {
      if (commands[i].type === 'M') {
        subpathMIndex = i;
        break;
      }
    }

    if (subpathMIndex === -1) return; // No M found

    // Get the point to move to M position
    let pointToMove: Point | null = null;
    if (command.type === 'L') {
      if (pointIndex === 0) pointToMove = command.position;
    } else if (command.type === 'C') {
      if (pointIndex === 0) pointToMove = command.controlPoint1;
      else if (pointIndex === 1) pointToMove = command.controlPoint2;
      else if (pointIndex === 2) pointToMove = command.position;
    }
    if (!pointToMove) return;

    const updatedCommands = [...commands];

    // Move the last point to the M position to close the subpath
    const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;
    const newCommand = { ...command };
    if (command.type === 'L') {
      const lCommand = newCommand as Command & { type: 'L' };
      if (pointIndex === 0) lCommand.position = mPosition;
      updatedCommands[commandIndex] = lCommand;
    } else if (command.type === 'C') {
      const cCommand = newCommand as Command & { type: 'C' };
      if (pointIndex === 0) cCommand.controlPoint1 = { ...command.controlPoint1, ...mPosition };
      else if (pointIndex === 1) cCommand.controlPoint2 = { ...command.controlPoint2, ...mPosition };
      else if (pointIndex === 2) cCommand.position = mPosition;
      updatedCommands[commandIndex] = cCommand;
    }

    // For C commands, we need to adjust control points to maintain curve shape
    if (command.type === 'C') {
      // For a C command, points are: [control1, control2, endpoint]
      // When moving the endpoint to the M position, we need to adjust control points
      const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;
      const originalEndpoint = command.position;

      // Calculate the offset
      const offsetX = mPosition.x - originalEndpoint.x;
      const offsetY = mPosition.y - originalEndpoint.y;

      // Move control points by the same offset to maintain relative positions
      updatedCommands[commandIndex] = {
        ...command,
        controlPoint1: { ...command.controlPoint1, x: command.controlPoint1.x + offsetX, y: command.controlPoint1.y + offsetY },
        controlPoint2: { ...command.controlPoint2, x: command.controlPoint2.x + offsetX, y: command.controlPoint2.y + offsetY },
        position: mPosition // endpoint moved to M position
      };
    }

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));
  },

  convertCommandType: (elementId: string, commandIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command) return;

    // Helper function to get command end point
    const getCommandEndPoint = (cmd: Command): Point | null => {
      if (cmd.type === 'Z') return null;
      return cmd.position;
    };

    const updatedCommands = [...commands];

    if (command.type === 'L') {
      // Convert L to C: need to add control points
      // For a smooth conversion, place control points at 1/3 and 2/3 of the line
      const startPoint = commandIndex > 0 ? getCommandEndPoint(commands[commandIndex - 1]) : { x: 0, y: 0 };
      const endPoint = command.position;

      if (startPoint) {
        // Calculate control points at 1/3 and 2/3 of the line
        const control1 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (1 / 3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (1 / 3)
        };
        const control2 = {
          x: startPoint.x + (endPoint.x - startPoint.x) * (2 / 3),
          y: startPoint.y + (endPoint.y - startPoint.y) * (2 / 3)
        };

        updatedCommands[commandIndex] = {
          type: 'C',
          controlPoint1: {
            ...control1,
            commandIndex,
            pointIndex: 0,
            anchor: startPoint,
            isControl: true
          },
          controlPoint2: {
            ...control2,
            commandIndex,
            pointIndex: 1,
            anchor: startPoint,
            isControl: true
          },
          position: endPoint
        };
      }
    } else if (command.type === 'C') {
      // Convert C to L: keep only the endpoint
      const endPoint = command.position; // Last point is the endpoint
      updatedCommands[commandIndex] = {
        type: 'L',
        position: endPoint
      };
    }

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));
  },

  cutSubpathAtPoint: (elementId: string, commandIndex: number, _pointIndex: number) => {
    const state = get() as unknown as FullCanvasState;
    const element = state.elements.find((el: CanvasElement) => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command || (command.type !== 'L' && command.type !== 'C')) return;

    // Get the current point position (always the command's position for cutting)
    const currentPoint = command.position;
    if (!currentPoint) return;

    const updatedCommands = [...commands];

    // Create new M command at current point + 5
    const newMCommand: Command = {
      type: 'M',
      position: {
        x: currentPoint.x + 5,
        y: currentPoint.y + 5
      }
    };

    // Insert the new M command right after the current command
    updatedCommands.splice(commandIndex + 1, 0, newMCommand);

    // The remaining commands after the original commandIndex are already in the right place

    // Normalize and reconstruct path
    const normalizedCommands = normalizePathCommands(updatedCommands);

    const newSubPaths = extractSubpaths(normalizedCommands).map(s => s.commands);

    // Update the element
    (set as (fn: (state: FullCanvasState) => Partial<FullCanvasState>) => void)((currentState) => ({
      ...currentState,
      elements: currentState.elements.map((el) => {
        if (el.id === elementId && el.type === 'path') {
          return { ...el, data: { ...pathData, subPaths: newSubPaths } };
        }
        return el;
      }) as CanvasElement[],
    }));

    // Clear selection after cutting subpath (indices may have changed)
    const currentState = get() as unknown as FullCanvasState;
    currentState.clearSelectedCommands?.();
  },

});
