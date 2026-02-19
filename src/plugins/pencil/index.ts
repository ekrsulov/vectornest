import type { PluginDefinition, PluginContextFull } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPencilPluginSlice } from './slice';
import { Pen } from 'lucide-react';
import type { PencilPluginSlice } from './slice';
import React from 'react';
import { PencilPanel } from './PencilPanel';
import { startPath, addPointToPath, finalizePath } from './actions';
import type { Point } from '../../types';
import { usePencilDrawingHook } from './hooks/usePencilDrawingHook';
import { clientToCanvas } from '../../utils/pointUtils';
import { installGlobalPluginListeners } from '../../utils/pluginListeners';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createToolPanel } from '../../utils/pluginFactories';

type PencilStore = CanvasStore & PencilPluginSlice;

type PencilPluginApi = {
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
};

const pencilSliceFactory = createPluginSlice(createPencilPluginSlice);
// Global listener flags and cleanup handles
let listenersInstalled = false;
// No manual store subscription required; helper handles auto-cleanup.

const installListeners = (context: PluginContextFull<CanvasStore>, api: PencilPluginApi) => {
  if (listenersInstalled) return;
  listenersInstalled = true;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    // Only draw if primary button is pressed
    if (moveEvent.buttons !== 1) return;

    const svg = document.querySelector('svg');
    if (!svg) return;

    const currentState = context.store.getState() as PencilStore;
    const canvasPoint = clientToCanvas(moveEvent.clientX, moveEvent.clientY, svg, currentState.viewport);

    api.addPointToPath(canvasPoint);
  };

  const handlePointerUp = (_upEvent: PointerEvent) => {
    // Pencil path finalization is typically handled by the service or when the user switches tools
    // But we can ensure we stop listening if the user stops drawing
    // For pencil, we might want to keep listening if they click again, but here we are just handling the drag
  };

  installGlobalPluginListeners(context, [
    { event: 'pointermove', handler: handlePointerMove },
    { event: 'pointerup', handler: handlePointerUp },
  ], (s) => s.activePlugin !== 'pencil');

  // cleanup returned from installGlobalPluginListeners is sufficient
};

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: {
    label: 'Pencil',
    icon: Pen,
    cursor: 'crosshair',
    disablePathInteraction: true,
  },
  toolDefinition: { order: 10, visibility: 'always-shown', toolGroup: 'creation' },
  handler: (_event, point, _target, context) => {
    const api = context.api as PencilPluginApi;
    api.startPath(point);
    installListeners(context, api);
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as PencilStore;
      state.deleteSelectedElements();
    },
  },
  slices: [pencilSliceFactory],
  createApi: ({ store }) => ({
    startPath: (point: Point) => {
      startPath(point, store.getState);
    },
    addPointToPath: (point: Point) => {
      addPointToPath(point, store.getState);
    },
    finalizePath: (points: Point[]) => {
      finalizePath(points, store.getState);
    },
  }),
  hooks: [
    {
      id: 'pencil-drawing',
      hook: usePencilDrawingHook,
    },
  ],
  expandablePanel: () => React.createElement(PencilPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('pencil', PencilPanel)],
};

