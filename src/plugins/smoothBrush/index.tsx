 
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSmoothBrushPluginSlice, type SmoothBrushPluginSlice } from './slice';

// Import listener to ensure it registers itself
import './listeners/SmoothBrushListener';

import { SmoothBrushPanel } from './SmoothBrushPanel';
import { SmoothBrushCursor } from './SmoothBrushCursor';
import { useSmoothBrushHook } from './hooks/useSmoothBrushHook';

type SmoothBrushBehaviorStore = CanvasStore & {
    smoothBrush?: SmoothBrushPluginSlice['smoothBrush'];
};

export const smoothBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'smoothBrush',
    metadata: {
        label: 'Smooth Brush',
        cursor: 'default',
    },
    behaviorFlags: (state) => {
        const smoothBrush = (state as SmoothBrushBehaviorStore).smoothBrush;
        return {
            preventsSelection: smoothBrush?.isActive ?? false,
            preventsSubpathInteraction: smoothBrush?.isActive ?? false,
        };
    },
    slices: [createPluginSlice(createSmoothBrushPluginSlice)],
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
