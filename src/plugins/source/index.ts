import { FileCode } from 'lucide-react';
import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSourcePluginSlice } from './sourcePluginSlice';
import { canvasStoreApi, registerPluginSlices } from '../../store/canvasStore';

const SourcePanel = React.lazy(() =>
    import('./SourcePanel').then((module) => ({ default: module.SourcePanel }))
);

export const sourcePlugin: PluginDefinition<CanvasStore> = {
    id: 'source',
    metadata: {
        label: 'Source',
        icon: FileCode,
        cursor: 'default',
    },
    init: () => {
        registerPluginSlices(canvasStoreApi, 'source', [
            { state: createSourcePluginSlice(canvasStoreApi.setState, canvasStoreApi.getState, canvasStoreApi) },
        ]);
    },
    sidebarPanels: [
        {
            key: 'source',
            condition: () => false,
            component: SourcePanel,
        },
    ],
    handler: () => { }, // No specific pointer handler
};
