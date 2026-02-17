
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPathSimplificationPluginSlice } from './slice';
import type { PathSimplificationPluginSlice } from './slice';
import { PathSimplificationPanel } from './PathSimplificationPanel';
import { createPluginSlice } from '../../utils/pluginUtils';

export type { PathSimplificationPluginSlice };

const pathSimplificationSliceFactory = createPluginSlice(createPathSimplificationPluginSlice);
export const pathSimplificationPlugin: PluginDefinition<CanvasStore> = {
    id: 'pathSimplification',
    metadata: {
        label: 'Path Simplification',
        cursor: 'default',
    },
    slices: [pathSimplificationSliceFactory],
    relatedPluginPanels: [
        {
            id: 'pathSimplification-edit-panel',
            targetPlugin: 'edit',
            component: PathSimplificationPanel,
            order: 3,
        },
    ],
};
