/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, SnapOverlayConfig } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { SnapStoreSlice } from '../../snap/types';
import { createToolPanel, createConditionalToolPanel } from '../../utils/pluginFactories';
import { MousePointerClick } from 'lucide-react';
import { createEditPluginSlice } from './slice';
import type { EditPluginSlice } from './slice';
// no React import needed
import { EditPanel } from './EditPanel';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import { BlockingOverlay } from '../../overlays';
import { pluginManager } from '../../utils/pluginManager';
import { createPluginSlice } from '../../utils/pluginUtils';

/**
 * Get snap overlay configuration for edit mode (objectSnap).
 * This decouples SnapOverlay from knowing about objectSnap/editingPoint internals.
 */
function getEditSnapOverlayConfig(): SnapOverlayConfig | null {
  const state = canvasStoreApi.getState() as CanvasStore & SnapStoreSlice & EditPluginSlice;
  const objectSnap = state.objectSnap;
  const editingPoint = state.editingPoint;
  const draggingSelection = state.draggingSelection;
  const draggingSubpaths = state.draggingSubpaths;
  const snapPoints = state.snapPoints; // Read from global state

  if (!objectSnap?.enabled) return null;

  const isDragging = editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging;

  return {
    showStaticPoints: snapPoints?.showSnapPoints ?? false,
    cachedSnapPoints: objectSnap.cachedSnapPoints ?? [],
    availableSnapPoints: objectSnap.availableSnapPoints ?? [],
    snapPointsOpacity: snapPoints?.snapPointsOpacity ?? 50,
    currentSnapInfo: objectSnap.currentSnapPoint ?? null,
    isInteracting: isDragging ?? false,
    mode: 'objectSnap',
    handlesFeedbackInternally: true,
    isPointEditMode: true,
    usesDirectDragging: true,
  };
}

const EditExpandablePanelWrapper: React.FC = () => {
  const activePlugin = useCanvasStore(s => s.activePlugin);

  return <EditPanel activePlugin={activePlugin} />;
};
import { ControlPointAlignmentPanel } from './ControlPointAlignmentPanel';
import { EditPointsOverlay } from './EditPointsOverlay';
import { EditFeedbackLayer } from './EditFeedbackLayer';
import {
  Trash2,
  Grid3x3,
  Move,
  Combine,
  SplitSquareVertical,
} from 'lucide-react';
import { extractEditablePoints, getControlPointAlignmentInfo } from '../../utils/pathParserUtils';
import { registerEditDragHandlers } from './dragHandlers';

const editSliceFactory = createPluginSlice(createEditPluginSlice);
export const editPlugin: PluginDefinition<CanvasStore> = {
  id: 'edit',
  metadata: {
    label: 'Edit',
    icon: MousePointerClick,
    cursor: 'pointer',
  },
  init: () => {
    const unregister = registerEditDragHandlers();
    return () => {
      unregister();
    };
  },
  modeConfig: {
    description: 'Precise editing of nodes and handlers.',
    toggleTo: 'select',
  },
  behaviorFlags: () => ({
    selectionMode: 'commands',
    showPointFeedback: true,
    usesObjectSnap: true,
    getSnapOverlayConfig: getEditSnapOverlayConfig,
  }),
  toolDefinition: {
    order: 4,
    visibility: 'dynamic',
    toolGroup: 'basic',
    isDisabled: (store) => {
      // Edit requires exactly one path element selected
      const { selectedIds, elements } = store;
      if (selectedIds.length !== 1) return true;
      const element = elements.find(el => el.id === selectedIds[0]);
      return !element || element.type !== 'path';
    },
  },
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = state.selectedIds.length === 1 && state.selectedIds[0] === elementId;
    if (!wasAlreadySelected) {
      // Different element -> selection changed, stay in edit mode
    }
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (!wasAlreadySelected) {
      const subpathSelection = [{ elementId, subpathIndex }];
      context.store.setState({ selectedSubpaths: subpathSelection });
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
  handler: (
    event,
    point,
    target,
    context
  ) => {
    // Check if active plugin prevents selection (e.g., drawing tools, add point mode)
    const shouldPreventSelection = pluginManager.shouldPreventSelection();

    // Don't start selection rectangle if any plugin prevents it
    if (shouldPreventSelection) {
      return;
    }

    // Allow selection rectangle to start on SVG or on path elements (but not on edit points)
    if (target.tagName === 'svg' || target.tagName === 'path') {
      context.helpers.beginSelectionRectangle?.(point, !event.shiftKey, false);
    }
  },
  keyboardShortcuts: {
    Delete: (_event, context) => {
      const store = context.store as { deleteSelectedCommands?: () => void };
      store.deleteSelectedCommands?.();
    },
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedCommands?.length ?? 0) > 0) {
        state.clearSelectedCommands?.();
      } else if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.setActivePlugin('subpath');
      } else {
        state.setActivePlugin('select');
      }
    },
  },
  canvasLayers: [
    {
      id: 'edit-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize, editingPoint, draggingSelection }) => {
        // Activate overlay when dragging points or selections
        const isActive = (editingPoint?.isDragging ?? false) || (draggingSelection?.isDragging ?? false);
        return (
          <BlockingOverlay
            viewport={viewport}
            canvasSize={canvasSize}
            isActive={isActive}
          />
        );
      },
    },
    {
      id: 'edit-points-overlay',
      placement: 'foreground',
      render: ({
        elements,
        selectedIds,
        selectedSubpaths,
        activePlugin,
        selectedCommands,
        editingPoint,
        draggingSelection,
        dragPosition,
        viewport,
        getFilteredEditablePoints,
        startDraggingPoint,
        selectCommand,
        isElementHidden,
      }) => {
        if (activePlugin !== 'edit') {
          return null;
        }

        return (
          <>
            {elements
              .filter((element) =>
                element.type === 'path' && (!isElementHidden || !isElementHidden(element.id))
              )
              .map((element) => {
                const isSelected = selectedIds.includes(element.id);
                const hasSelectedSubpath = (selectedSubpaths ?? []).some((subpath: { elementId: string }) => subpath.elementId === element.id);

                if (!isSelected && !hasSelectedSubpath) {
                  return null;
                }

                return (
                  <EditPointsOverlay
                    key={`edit-overlay-${element.id}`}
                    element={element}
                    selectedCommands={selectedCommands ?? []}
                    editingPoint={editingPoint ?? null}
                    draggingSelection={draggingSelection ?? null}
                    dragPosition={dragPosition}
                    viewport={viewport}
                    getFilteredEditablePoints={getFilteredEditablePoints ?? (() => [])}
                    onStartDraggingPoint={startDraggingPoint ?? (() => { })}
                    onSelectCommand={selectCommand ?? (() => { })}
                  />
                );
              })}
          </>
        );
      },
    },

    {
      id: 'point-position-feedback',
      placement: 'foreground',
      render: ({ activePlugin, dragPosition, viewport, canvasSize }) => (
        <EditFeedbackLayer
          viewport={viewport}
          canvasSize={canvasSize}
          dragPosition={dragPosition}
          activePlugin={activePlugin}
        />
      ),
    },
  ],
  slices: [editSliceFactory],
  // Use a proper React component wrapper for the expandable panel
  expandablePanel: EditExpandablePanelWrapper,
  sidebarPanels: [
    createToolPanel('edit', EditPanel, {
      key: 'edit',
    }),
    createConditionalToolPanel(
      'edit',
      ControlPointAlignmentPanel,
      (ctx) => ctx.selectedCommandsCount === 1,
      { key: 'control-point-alignment' }
    ),
  ],
  contextMenuActions: [
    {
      id: 'delete-point',
      action: (context) => {
        if (!context) return null;
        if (context.type !== 'point-anchor-m' && context.type !== 'point-anchor-l' && context.type !== 'point-anchor-c' && context.type !== 'point-control') return null;
        const store = useCanvasStore.getState();
        return {
          id: 'delete-point',
          label: 'Delete',
          icon: Trash2,
          onClick: () => store.deleteSelectedCommands?.(),
          variant: 'danger',
        };
      },
    },
    // Actions for M points with closing Z command
    {
      id: 'delete-z-command',
      action: (context) => {
        if (context.type !== 'point-anchor-m' || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        // Helper to check if M point has closing Z command
        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const command = commands[pointInfo.commandIndex];

        if (command.type !== 'M') return null;

        // Check for Z command
        let hasZ = false;
        for (let i = pointInfo.commandIndex + 1; i < commands.length; i++) {
          if (commands[i].type === 'Z') {
            let lastMIndex = -1;
            for (let j = i - 1; j >= 0; j--) {
              if (commands[j].type === 'M') {
                lastMIndex = j;
                break;
              }
            }
            if (lastMIndex === pointInfo.commandIndex) {
              hasZ = true;
              break;
            }
          } else if (commands[i].type === 'M') {
            break;
          }
        }

        if (!hasZ) return null;

        return {
          id: 'delete-z-command',
          label: 'Delete Z Command',
          icon: Trash2,
          onClick: () => store.deleteZCommandForMPoint?.(pointInfo.elementId, pointInfo.commandIndex),
        };
      },
    },
    {
      id: 'convert-z-to-line',
      action: (context) => {
        if (context.type !== 'point-anchor-m' || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        // Helper to check if M point has closing Z command
        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const command = commands[pointInfo.commandIndex];

        if (command.type !== 'M') return null;

        // Check for Z command
        let hasZ = false;
        for (let i = pointInfo.commandIndex + 1; i < commands.length; i++) {
          if (commands[i].type === 'Z') {
            let lastMIndex = -1;
            for (let j = i - 1; j >= 0; j--) {
              if (commands[j].type === 'M') {
                lastMIndex = j;
                break;
              }
            }
            if (lastMIndex === pointInfo.commandIndex) {
              hasZ = true;
              break;
            }
          } else if (commands[i].type === 'M') {
            break;
          }
        }

        if (!hasZ) return null;

        return {
          id: 'convert-z-to-line',
          label: 'Convert Z to Line',
          icon: Grid3x3,
          onClick: () => store.convertZToLineForMPoint?.(pointInfo.elementId, pointInfo.commandIndex),
        };
      },
    },
    // Actions for L points
    {
      id: 'move-to-m',
      action: (context) => {
        if ((context.type !== 'point-anchor-l' && context.type !== 'point-anchor-c') || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const command = commands[pointInfo.commandIndex];

        // Check if last point in subpath
        const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
        const isLastPoint = pointInfo.pointIndex === pointsLength - 1;
        if (!isLastPoint) return null;

        const isLastCommandInSubpath = pointInfo.commandIndex === commands.length - 1 ||
          commands[pointInfo.commandIndex + 1].type === 'M' ||
          commands[pointInfo.commandIndex + 1].type === 'Z';

        if (!isLastCommandInSubpath) return null;

        // Check if at M position
        let subpathMIndex = -1;
        for (let i = pointInfo.commandIndex - 1; i >= 0; i--) {
          if (commands[i].type === 'M') {
            subpathMIndex = i;
            break;
          }
        }

        if (subpathMIndex === -1) return null;

        const mPosition = (commands[subpathMIndex] as import('../../types').Command & { type: 'M' }).position;
        let pointToCheck: import('../../types').Point | null = null;

        if (command.type === 'M' || command.type === 'L') {
          if (pointInfo.pointIndex === 0) pointToCheck = command.position;
        } else if (command.type === 'C') {
          if (pointInfo.pointIndex === 0) pointToCheck = command.controlPoint1;
          else if (pointInfo.pointIndex === 1) pointToCheck = command.controlPoint2;
          else if (pointInfo.pointIndex === 2) pointToCheck = command.position;
        }

        if (!pointToCheck || !mPosition) return null;

        const tolerance = 0.1;
        const atMPosition = Math.abs(pointToCheck.x - mPosition.x) < tolerance &&
          Math.abs(pointToCheck.y - mPosition.y) < tolerance;

        if (atMPosition) return null;

        return {
          id: 'move-to-m',
          label: 'Move to M',
          icon: Move,
          onClick: () => store.moveToM?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
        };
      },
    },
    {
      id: 'change-to-curve',
      action: (context) => {
        if (context.type !== 'point-anchor-l' || !context.pointInfo) return null;
        const { pointInfo } = context;
        const store = useCanvasStore.getState();
        return {
          id: 'change-to-curve',
          label: 'Change to Curve',
          icon: Grid3x3,
          onClick: () => store.convertCommandType?.(pointInfo.elementId, pointInfo.commandIndex),
        };
      },
    },
    {
      id: 'change-to-line',
      action: (context) => {
        if (context.type !== 'point-anchor-c' || !context.pointInfo) return null;
        const { pointInfo } = context;
        const store = useCanvasStore.getState();
        return {
          id: 'change-to-line',
          label: 'Change to Line',
          icon: Grid3x3,
          onClick: () => store.convertCommandType?.(pointInfo.elementId, pointInfo.commandIndex),
        };
      },
    },
    {
      id: 'add-z-command',
      action: (context) => {
        if ((context.type !== 'point-anchor-l' && context.type !== 'point-anchor-c') || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const command = commands[pointInfo.commandIndex];

        // Check if last point in subpath
        const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
        const isLastPoint = pointInfo.pointIndex === pointsLength - 1;
        if (!isLastPoint) return null;

        const isLastCommandInSubpath = pointInfo.commandIndex === commands.length - 1 ||
          commands[pointInfo.commandIndex + 1].type === 'M' ||
          commands[pointInfo.commandIndex + 1].type === 'Z';

        if (!isLastCommandInSubpath) return null;

        // Check if at M position
        let subpathMIndex = -1;
        for (let i = pointInfo.commandIndex - 1; i >= 0; i--) {
          if (commands[i].type === 'M') {
            subpathMIndex = i;
            break;
          }
        }

        if (subpathMIndex === -1) return null;

        const mPosition = (commands[subpathMIndex] as import('../../types').Command & { type: 'M' }).position;
        let pointToCheck: import('../../types').Point | null = null;

        if (command.type === 'M' || command.type === 'L') {
          if (pointInfo.pointIndex === 0) pointToCheck = command.position;
        } else if (command.type === 'C') {
          if (pointInfo.pointIndex === 0) pointToCheck = command.controlPoint1;
          else if (pointInfo.pointIndex === 1) pointToCheck = command.controlPoint2;
          else if (pointInfo.pointIndex === 2) pointToCheck = command.position;
        }

        if (!pointToCheck || !mPosition) return null;

        const tolerance = 0.1;
        const atMPosition = Math.abs(pointToCheck.x - mPosition.x) < tolerance &&
          Math.abs(pointToCheck.y - mPosition.y) < tolerance;

        if (!atMPosition) return null;

        // Check if already has Z command
        let subpathEndIndex = pointInfo.commandIndex;
        for (let i = pointInfo.commandIndex + 1; i < commands.length; i++) {
          if (commands[i].type === 'M') {
            break;
          }
          subpathEndIndex = i;
        }

        let hasZ = false;
        if (subpathEndIndex < commands.length - 1 && commands[subpathEndIndex + 1].type === 'Z') {
          hasZ = true;
        }

        for (let i = pointInfo.commandIndex; i <= subpathEndIndex; i++) {
          if (commands[i].type === 'Z') {
            hasZ = true;
            break;
          }
        }

        if (hasZ) return null;

        return {
          id: 'add-z-command',
          label: 'Add Z Command',
          icon: Combine,
          onClick: () => store.addZCommandToSubpath?.(pointInfo.elementId, pointInfo.commandIndex),
        };
      },
    },
    {
      id: 'cut-subpath',
      action: (context) => {
        if ((context.type !== 'point-anchor-l' && context.type !== 'point-anchor-c') || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const command = commands[pointInfo.commandIndex];

        // Only show if NOT last point in subpath
        const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
        const isLastPoint = pointInfo.pointIndex === pointsLength - 1;
        if (!isLastPoint) return null;

        const isLastCommandInSubpath = pointInfo.commandIndex === commands.length - 1 ||
          commands[pointInfo.commandIndex + 1].type === 'M' ||
          commands[pointInfo.commandIndex + 1].type === 'Z';

        if (isLastCommandInSubpath) return null;

        return {
          id: 'cut-subpath',
          label: 'Cut Subpath',
          icon: SplitSquareVertical,
          onClick: () => store.cutSubpathAtPoint?.(pointInfo.elementId, pointInfo.commandIndex, pointInfo.pointIndex),
        };
      },
    },
    // Actions for control points
    {
      id: 'control-point-alignment',
      action: (context) => {
        if (context.type !== 'point-control' || !context.pointInfo) return null;

        const { pointInfo } = context;
        const store = useCanvasStore.getState();

        const element = store.elements.find(el => el.id === pointInfo.elementId);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as import('../../types').PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        const point = points.find(p => p.commandIndex === pointInfo.commandIndex && p.pointIndex === pointInfo.pointIndex);

        if (!point || !point.isControl) return null;

        const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
        if (!alignmentInfo || alignmentInfo.pairedCommandIndex === undefined || alignmentInfo.pairedPointIndex === undefined) {
          return null;
        }

        // Find the paired control point to ensure it exists
        const pairedPoint = points.find((p: import('../../types').ControlPoint) =>
          p.commandIndex === alignmentInfo.pairedCommandIndex && p.pointIndex === alignmentInfo.pairedPointIndex
        );

        if (!pairedPoint) return null;

        return {
          id: 'control-point-alignment',
          label: 'Control Point Alignment',
          icon: Grid3x3,
          submenu: [
            {
              id: 'independent',
              label: 'Independent',
              icon: Grid3x3,
              onClick: () => {
                const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                if (alignmentInfo && store.setControlPointAlignmentType) {
                  store.setControlPointAlignmentType(
                    pointInfo.elementId,
                    pointInfo.commandIndex,
                    pointInfo.pointIndex,
                    alignmentInfo.pairedCommandIndex ?? 0,
                    alignmentInfo.pairedPointIndex ?? 0,
                    'independent'
                  );
                }
              },
            },
            {
              id: 'aligned',
              label: 'Aligned',
              icon: Grid3x3,
              onClick: () => {
                const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                if (alignmentInfo && store.setControlPointAlignmentType) {
                  store.setControlPointAlignmentType(
                    pointInfo.elementId,
                    pointInfo.commandIndex,
                    pointInfo.pointIndex,
                    alignmentInfo.pairedCommandIndex ?? 0,
                    alignmentInfo.pairedPointIndex ?? 0,
                    'aligned'
                  );
                }
              },
            },
            {
              id: 'mirrored',
              label: 'Mirrored',
              icon: Grid3x3,
              onClick: () => {
                const alignmentInfo = getControlPointAlignmentInfo(commands, points, pointInfo.commandIndex, pointInfo.pointIndex);
                if (alignmentInfo && store.setControlPointAlignmentType) {
                  store.setControlPointAlignmentType(
                    pointInfo.elementId,
                    pointInfo.commandIndex,
                    pointInfo.pointIndex,
                    alignmentInfo.pairedCommandIndex ?? 0,
                    alignmentInfo.pairedPointIndex ?? 0,
                    'mirrored'
                  );
                }
              },
            },
          ],
        };
      },
    },
  ],
};
