/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSmoothBrushPluginSlice } from './slice';

// Import listener to ensure it registers itself
import './listeners/SmoothBrushListener';

import { SmoothBrushPanel } from './SmoothBrushPanel';
import { SmoothBrushCursor } from './SmoothBrushCursor';
import { useSmoothBrushHook } from './hooks/useSmoothBrushHook';

const smoothBrushSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    const slice = createSmoothBrushPluginSlice(set, get, api);
    return {
        state: slice,
    };
};

export const smoothBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'smoothBrush',
    metadata: {
        label: 'Smooth Brush',
        cursor: 'default',
    },
    behaviorFlags: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smoothBrush = (state as any).smoothBrush;
        return {
            preventsSelection: smoothBrush?.isActive ?? false,
            preventsSubpathInteraction: smoothBrush?.isActive ?? false,
        };
    },
    slices: [smoothBrushSliceFactory],
    registerHelpers: ({ store }) => ({
        isSmoothBrushActive: () => {
            const state = store.getState() as CanvasStore;
            return state.smoothBrush?.isActive ?? false;
        },
        getSmoothBrushState: () => {
            const state = store.getState() as CanvasStore;
            return state.smoothBrush ?? null;
        },
    }),
    hooks: [
        {
            id: 'smooth-brush-interaction',
            hook: useSmoothBrushHook,
            global: true, // Execute regardless of active plugin
        },
    ],
    relatedPluginPanels: [
        {
            id: 'smoothBrush-edit-panel',
            targetPlugin: 'edit',
            component: SmoothBrushPanel,
            order: 2,
        },
    ],
    canvasLayers: [
        {
            id: 'smooth-brush-cursor',
            placement: 'foreground',
            render: ({ activePlugin }) => {
                if (activePlugin !== 'edit') {
                    return null;
                }
                return <SmoothBrushCursor />;
            },
        },
    ],
};
