import type { CanvasStore } from '../../store/canvasStore';
import { registerDragHandler, unregisterDragHandler } from '../../canvas/interactions/dragHandlerRegistry';
import type { EditPluginSlice } from './slice';
import type { SubpathPluginSlice } from '../subpath/slice';

type EditStore = CanvasStore & EditPluginSlice & SubpathPluginSlice;

export const registerEditDragHandlers = (): (() => void) => {
  registerDragHandler({
    pluginId: 'edit',
    type: 'point',
    priority: 100,
    canHandle: (state) => Boolean((state as EditStore).editingPoint?.isDragging),
    getContext: (state) => {
      const s = state as EditStore;
      const editingPoint = s.editingPoint;
      if (!editingPoint?.isDragging) return null;

      return {
        pluginId: 'edit',
        type: 'point',
        isDragging: true,
        elementIds: editingPoint.elementId ? [editingPoint.elementId] : [],
        startPosition: null,
        currentPosition: null,
        excludeElementIds: editingPoint.elementId ? [editingPoint.elementId] : [],
        dragPointInfo: {
          elementId: editingPoint.elementId,
          commandIndex: editingPoint.commandIndex,
          pointIndex: editingPoint.pointIndex,
          isDragging: true,
          subpathIndex: 0,
        },
        metadata: {
          source: 'edit-point',
          editingPoint,
        },
      };
    },
  });

  registerDragHandler({
    pluginId: 'edit',
    type: 'selection',
    priority: 90,
    canHandle: (state) => Boolean((state as EditStore).draggingSelection?.isDragging),
    getContext: (state) => {
      const s = state as EditStore;
      const drag = s.draggingSelection;
      if (!drag?.isDragging) return null;

      const elementIds = drag.initialPositions?.map((p) => p.elementId) ?? [];

      return {
        pluginId: 'edit',
        type: 'selection',
        isDragging: true,
        elementIds,
        startPosition: drag.startX !== undefined && drag.startY !== undefined ? { x: drag.startX, y: drag.startY } : null,
        currentPosition:
          drag.currentX !== undefined && drag.currentY !== undefined ? { x: drag.currentX, y: drag.currentY } : null,
        excludeElementIds: elementIds,
        dragPointInfo: drag.draggedPoint
          ? {
              elementId: drag.draggedPoint.elementId,
              commandIndex: drag.draggedPoint.commandIndex,
              pointIndex: drag.draggedPoint.pointIndex,
              subpathIndex: 0,
              isDragging: true,
            }
          : undefined,
        metadata: {
          source: 'edit-selection',
          draggingSelection: drag,
        },
      };
    },
  });

  registerDragHandler({
    pluginId: 'edit',
    type: 'subpath',
    priority: 80,
    canHandle: (state) => Boolean((state as EditStore).draggingSubpaths?.isDragging),
    getContext: (state) => {
      const s = state as EditStore;
      const drag = s.draggingSubpaths;
      if (!drag?.isDragging) return null;

      const elementIds = drag.initialPositions?.map((p) => p.elementId) ?? [];

      return {
        pluginId: 'edit',
        type: 'subpath',
        isDragging: true,
        elementIds,
        startPosition: drag.startX !== undefined && drag.startY !== undefined ? { x: drag.startX, y: drag.startY } : null,
        currentPosition:
          drag.currentX !== undefined && drag.currentY !== undefined ? { x: drag.currentX, y: drag.currentY } : null,
        excludeElementIds: elementIds,
        metadata: {
          source: 'edit-subpath',
        },
      };
    },
  });

  return () => unregisterDragHandler('edit');
};
