
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createAddPointPluginSlice } from './slice';

// Import listener to ensure it registers itself
import './listeners/AddPointListener';

import { AddPointPanel } from './AddPointPanel';
import { AddPointFeedbackOverlay } from './AddPointFeedbackOverlay';
import { useAddPointHook } from './hooks/useAddPointHook';

const addPointSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    const slice = createAddPointPluginSlice(set, get, api);
    return {
        state: slice,
    };
};

export const addPointPlugin: PluginDefinition<CanvasStore> = {
    id: 'addPoint',
    metadata: {
        label: 'Add Point',
        cursor: 'default',
    },
    behaviorFlags: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addPointMode = (state as any).addPointMode;
        return {
            preventsSelection: addPointMode?.isActive ?? false,
            preventsSubpathInteraction: addPointMode?.isActive ?? false,
        };
    },
    slices: [addPointSliceFactory],
    hooks: [
        {
            id: 'add-point-interaction',
            hook: useAddPointHook,
            global: true, // Execute regardless of active plugin
        },
    ],
    relatedPluginPanels: [
        {
            id: 'addPoint-edit-panel',
            targetPlugin: 'edit',
            component: AddPointPanel,
            order: 1,
        },
    ],
    canvasLayers: [
        {
            id: 'add-point-feedback',
            placement: 'foreground',
            render: ({ activePlugin }) => {
                // Only show when in edit mode
                if (activePlugin !== 'edit') {
                    return null;
                }

                return <AddPointFeedbackOverlay />;
            },
        },
    ],
};
