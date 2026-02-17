import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { createPenPluginSlice } from './slice';
import { PenTool } from 'lucide-react';
import type { PenPluginSlice } from './slice';
import React from 'react';
import { PenPanel } from './PenPanel';
import { usePenDrawingHook } from './hooks/usePenDrawingHook';
import { RubberBandPreview } from './components/RubberBandPreview';
import { PenPathOverlay } from './components/PenPathOverlay';
import { PenCursorController } from './components/PenCursorController';
import { PenGuidelinesOverlay } from './components/PenGuidelinesOverlay';
import { cancelPath, finalizePath, undoPathPoint, redoPathPoint } from './actions';
import { registerShortcutInterceptor } from '../../canvas/shortcuts/shortcutInterceptorRegistry';
import { createPluginSlice } from '../../utils/pluginUtils';

type PenStore = CanvasStore & PenPluginSlice;

registerShortcutInterceptor({
    pluginId: 'pen',
    shortcuts: ['meta+z', 'ctrl+z', 'meta+shift+z', 'ctrl+shift+z'],
    priority: 100,
    shouldHandle: (state, _shortcut) => {
        const penState = (state as PenStore).pen;
        return state.activePlugin === 'pen' && penState?.mode === 'drawing';
    },
    handle: (_state, shortcut, context) => {
        const isRedo = shortcut.includes('shift');
        const getState = (context as { store: { getState: () => PenStore } }).store.getState;
        if (isRedo) {
            redoPathPoint(getState);
        } else {
            undoPathPoint(getState);
        }
        return true;
    },
});

const penSliceFactory = createPluginSlice(createPenPluginSlice);
export const penPlugin: PluginDefinition<CanvasStore> = {
    id: 'pen',
    metadata: {
        label: 'Pen',
        icon: PenTool,
        cursor: 'crosshair',
        disablePathInteraction: true,
    },
    modeConfig: {
        description: 'Bézier path editor for creating precise vector paths with anchor points and handles.',
        entry: ['clearSubpathSelection', 'clearSelectedCommands'],
    },
    toolDefinition: {
        order: 7, // After pencil (6)
        visibility: 'always-shown',
        toolGroup: 'creation',
    },
    // Pen plugin manages its own undo/redo during drawing mode
    disablesGlobalUndoRedo: (store) => {
        const penState = (store as PenStore).pen;
        return penState?.mode === 'drawing';
    },
    subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
    handler: (_event, _point, _target, _context) => {
        // Main handler is managed by the hook
        // This is here for compatibility but actual handling is in usePenDrawingHook
    },
    keyboardShortcuts: {
        p: (event, { store }) => {
            if (!event.ctrlKey && !event.metaKey) {
                const state = store.getState() as PenStore;
                state.setActivePlugin?.('pen');
            }
        },
        Enter: (_event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                finalizePath(state.getState);
            }
        },
        Escape: (_event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                cancelPath(state.getState);
            }
        },
        Delete: (_event, { store }) => {
            const state = store.getState() as PenStore;
            state.deleteSelectedElements?.();
        },
        'meta+z': (event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                undoPathPoint(store.getState as () => PenStore);
            }
        },
        'ctrl+z': (event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                undoPathPoint(store.getState as () => PenStore);
            }
        },
        'meta+shift+z': (event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                redoPathPoint(store.getState as () => PenStore);
            }
        },
        'ctrl+shift+z': (event, { store }) => {
            const state = store.getState() as PenStore;
            if (state.pen?.mode === 'drawing') {
                event.preventDefault();
                event.stopPropagation();
                redoPathPoint(store.getState as () => PenStore);
            }
        },
    },
    slices: [penSliceFactory],
    hooks: [
        {
            id: 'pen-drawing',
            hook: usePenDrawingHook,
        },
    ],
    canvasLayers: [
        {
            id: 'pen-cursor-controller',
            placement: 'foreground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenCursorController);
            },
        },
        {
            id: 'pen-guidelines-overlay',
            placement: 'background',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenGuidelinesOverlay, { context });
            },
        },
        {
            id: 'pen-path-overlay',
            placement: 'midground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(PenPathOverlay, { context });
            },
        },
        {
            id: 'rubber-band-preview',
            placement: 'foreground',
            render: (context) => {
                if (context.activePlugin !== 'pen') return null;
                return React.createElement(RubberBandPreview, { context });
            },
        },
    ],
    expandablePanel: () => React.createElement(PenPanel, { hideTitle: true }),
    sidebarPanels: [createToolPanel('pen', PenPanel)],
};

export type { PenPluginSlice };
export { PenPanel };
