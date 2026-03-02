import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createAddPointPluginSlice, type AddPointPluginSlice } from './slice';

// Import listener to ensure it registers itself
import './listeners/AddPointListener';

import { AddPointFeedbackOverlay } from './AddPointFeedbackOverlay';
import { useAddPointHook } from './hooks/useAddPointHook';

const AddPointPanel = React.lazy(() =>
    import('./AddPointPanel').then((module) => ({ default: module.AddPointPanel }))
);

type AddPointBehaviorStore = CanvasStore & {
    addPointMode?: AddPointPluginSlice['addPointMode'];
};

export const addPointPlugin: PluginDefinition<CanvasStore> = {
    id: 'addPoint',
    metadata: {
        label: 'Add Point',
        cursor: 'default',
    },
    behaviorFlags: (state) => {
        const addPointMode = (state as AddPointBehaviorStore).addPointMode;
        return {
            preventsSelection: addPointMode?.isActive ?? false,
            preventsSubpathInteraction: addPointMode?.isActive ?? false,
        };
    },
    slices: [createPluginSlice(createAddPointPluginSlice)],
    hooks: [
        {
            id: 'add-point-interaction',
            hook: useAddPointHook,
            global: true, // Execute regardless of active plugin
            when: (state) => Boolean((state as AddPointBehaviorStore).addPointMode?.isActive),
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
