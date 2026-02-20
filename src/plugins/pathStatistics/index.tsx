import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { BarChart3 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathStatisticsSlice } from './slice';
import { PathStatisticsPanel } from './PathStatisticsPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathStatistics', ['pathStatistics'], 'temporal');

export const pathStatisticsPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathStatistics',
  metadata: {
    label: 'Path Statistics',
    icon: BarChart3,
    cursor: 'default',
  },
  slices: [createPluginSlice(createPathStatisticsSlice)],
  relatedPluginPanels: [
    {
      id: 'path-statistics',
      targetPlugin: 'auditLibrary',
      component: PathStatisticsPanel,
      order: 90,
    },
  ],
};

export type { PathStatisticsPluginSlice } from './slice';
