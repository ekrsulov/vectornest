import { FileCode } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSourcePluginSlice } from './sourcePluginSlice';
import { canvasStoreApi, registerPluginSlices } from '../../store/canvasStore';
import { SourcePanel } from './SourcePanel';

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
            condition: (ctx) => ctx.showFilePanel,
            component: SourcePanel,
        },
    ],
    handler: () => { }, // No specific pointer handler
};
