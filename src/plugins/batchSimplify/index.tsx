import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createBatchSimplifySlice } from './slice';
import { createPluginSlice } from '../../utils/pluginUtils';

const batchSimplifySliceFactory = createPluginSlice(createBatchSimplifySlice);
const BatchSimplifyPanel = React.lazy(() =>
    import('./BatchSimplifyPanel').then((module) => ({ default: module.BatchSimplifyPanel }))
);

export const batchSimplifyPlugin: PluginDefinition<CanvasStore> = {
    id: 'batchSimplify',
    metadata: {
        label: 'Batch Simplify',
        cursor: 'default',
    },
    slices: [batchSimplifySliceFactory],
    relatedPluginPanels: [
        {
            id: 'batch-simplify',
            targetPlugin: 'generatorLibrary',
            component: BatchSimplifyPanel,
            order: 215,
        },
    ],
};

export type { BatchSimplifyPluginSlice } from './slice';
