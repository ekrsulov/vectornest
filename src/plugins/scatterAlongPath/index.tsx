import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Workflow } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createScatterAlongPathSlice } from './slice';
import { ScatterAlongPathPanel } from './ScatterAlongPathPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('scatterAlongPath', ['scatterAlongPath'], 'temporal');

const scatterAlongPathSliceFactory = createPluginSlice(createScatterAlongPathSlice);

export const scatterAlongPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'scatterAlongPath',
  metadata: {
    label: 'Scatter Along Path',
    icon: Workflow,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [scatterAlongPathSliceFactory],
  relatedPluginPanels: [
    {
      id: 'scatterAlongPath-panel',
      targetPlugin: 'generatorLibrary',
      component: ScatterAlongPathPanel,
      order: 230,
    },
  ],
};

export type { ScatterAlongPathPluginSlice } from './slice';
