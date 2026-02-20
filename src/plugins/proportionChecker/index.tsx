import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Scaling } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createProportionCheckerSlice } from './slice';
import { ProportionCheckerPanel } from './ProportionCheckerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('proportionChecker', ['proportionChecker'], 'temporal');

export const proportionCheckerPlugin: PluginDefinition<CanvasStore> = {
  id: 'proportionChecker',
  metadata: {
    label: 'Proportion Checker',
    icon: Scaling,
    cursor: 'default',
  },
  slices: [createPluginSlice(createProportionCheckerSlice)],
  relatedPluginPanels: [
    {
      id: 'proportion-checker-panel',
      targetPlugin: 'auditLibrary',
      component: ProportionCheckerPanel,
      order: 10,
    },
  ],
};

export type { ProportionCheckerPluginSlice } from './slice';
