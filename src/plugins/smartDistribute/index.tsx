import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Waypoints } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSmartDistributeSlice } from './slice';
import { SmartDistributePanel } from './SmartDistributePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('smartDistribute', ['smartDistribute'], 'temporal');

export const smartDistributePlugin: PluginDefinition<CanvasStore> = {
  id: 'smartDistribute',
  metadata: {
    label: 'Smart Distribute',
    icon: Waypoints,
    cursor: 'default',
  },
  slices: [createPluginSlice(createSmartDistributeSlice)],
  relatedPluginPanels: [
    {
      id: 'smart-distribute-panel',
      targetPlugin: 'generatorLibrary',
      component: SmartDistributePanel,
      order: 270,
    },
  ],
};

export type { SmartDistributePluginSlice } from './slice';
