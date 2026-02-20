import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { LayoutGrid } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createLayoutEngineSlice } from './slice';
import { LayoutEnginePanel } from './LayoutEnginePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('layoutEngine', ['layoutEngine'], 'temporal');

export const layoutEnginePlugin: PluginDefinition<CanvasStore> = {
  id: 'layoutEngine',
  metadata: {
    label: 'Layout Engine',
    icon: LayoutGrid,
    cursor: 'default',
  },
  slices: [createPluginSlice(createLayoutEngineSlice)],
  relatedPluginPanels: [
    {
      id: 'layout-engine-panel',
      targetPlugin: 'generatorLibrary',
      component: LayoutEnginePanel,
      order: 260,
    },
  ],
};

export type { LayoutEnginePluginSlice } from './slice';
