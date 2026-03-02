import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Workflow } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createScatterAlongPathSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('scatterAlongPath', ['scatterAlongPath'], 'temporal');
const ScatterAlongPathPanel = lazy(() =>
  import('./ScatterAlongPathPanel').then((module) => ({ default: module.ScatterAlongPathPanel }))
);

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
