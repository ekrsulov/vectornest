import type { PluginDefinition, PluginContextFull } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { PaintBucket } from 'lucide-react';
import { fillGridCell, getCellKey } from './actions';
import { clientToCanvas } from '../../utils/pointUtils';
import { installGlobalPluginListeners } from '../../utils/pluginListeners';
import type { Point } from '../../types';

type GridFillPluginApi = {
  fillGridCell: (point: Point) => string | null;
};

// Track drag state for continuous painting
let isDragging = false;
let paintedCells = new Set<string>();
let cleanupDragListeners: (() => void) | null = null;

/**
 * Start drag painting mode
 */
function startDragPainting(
  initialPoint: Point,
  context: PluginContextFull<CanvasStore>,
  api: GridFillPluginApi
): void {
  isDragging = true;
  paintedCells = new Set<string>();

  // Paint the initial cell
  const state = context.store.getState() as CanvasStore;
  const grid = state.grid;
  if (grid?.enabled) {
    const cellKey = getCellKey(initialPoint, grid.type, grid.spacing, state);
    if (cellKey && !paintedCells.has(cellKey)) {
      const result = api.fillGridCell(initialPoint);
      if (result) {
        paintedCells.add(cellKey);
      }
    }
  }

  const svg = document.querySelector('svg');
  if (!svg) return;

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    // const rect = svg.getBoundingClientRect();
    const currentState = context.store.getState() as CanvasStore;
    const { viewport } = currentState;

    // Convert screen coordinates to canvas coordinates
    const canvasPoint = clientToCanvas(event.clientX, event.clientY, svg, viewport);

    const grid = currentState.grid;
    if (grid?.enabled) {
      const cellKey = getCellKey(canvasPoint, grid.type, grid.spacing, currentState);
      if (cellKey && !paintedCells.has(cellKey)) {
        const result = api.fillGridCell(canvasPoint);
        if (result) {
          paintedCells.add(cellKey);
        }
      }
    }
  };

  const handlePointerUp = () => {
    stopDragPainting();
  };

  const handlePointerLeave = () => {
    stopDragPainting();
  };

  // Add listeners via centralized helper which will cleanup when active plugin changes
  cleanupDragListeners = installGlobalPluginListeners(context, [
    { event: 'pointermove', handler: handlePointerMove },
    { event: 'pointerup', handler: () => handlePointerUp() },
    { event: 'pointerleave', handler: () => handlePointerLeave() },
  ], (state) => (state as CanvasStore).activePlugin !== 'gridFill');
}

/**
 * Stop drag painting mode
 */
function stopDragPainting(): void {
  isDragging = false;
  paintedCells = new Set<string>();
  if (cleanupDragListeners) {
    cleanupDragListeners();
    cleanupDragListeners = null;
  }
}

export const gridFillPlugin: PluginDefinition<CanvasStore> = {
  id: 'gridFill',
  metadata: {
    label: 'Grid Fill',
    icon: PaintBucket,
    cursor: 'crosshair',
  },
  toolDefinition: {
    order: 24,
    visibility: 'dynamic',
    toolGroup: 'advanced',
    isVisible: (store) => {
      // Only show gridFill tool when grid is enabled
      return store.grid?.enabled ?? false;
    },
  },
  handler: (_event, point, _target, context) => {
    const api = context.api as GridFillPluginApi;
    // Start drag painting mode on pointerdown
    startDragPainting(point, context, api);
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
  },
  slices: [],
  createApi: ({ store }) => ({
    fillGridCell: (point: Point) => {
      return fillGridCell(point, store.getState);
    },
  }),
};
