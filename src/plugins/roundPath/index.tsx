
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createRoundPathPluginSlice } from './slice';
import { RoundPathPanel } from './RoundPathPanel';


const roundPathSliceFactory = createPluginSlice(createRoundPathPluginSlice);
export const roundPathPlugin: PluginDefinition<CanvasStore> = {
    id: 'roundPath',
    metadata: {
        label: 'Round Path',
        cursor: 'default',
    },
    slices: [roundPathSliceFactory],
    relatedPluginPanels: [
        {
            id: 'roundPath-edit-panel',
            targetPlugin: 'edit',
            component: RoundPathPanel,
            order: 4,
        },
    ],
};
