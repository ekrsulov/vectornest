import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSelectionStatisticsSlice } from './slice';
import { SelectionStatisticsPanel } from './SelectionStatisticsPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('selectionStatistics', ['selectionStatistics'], 'temporal');

export const selectionStatisticsPlugin: PluginDefinition<CanvasStore> = {
  id: 'selectionStatistics',
  metadata: {
    label: 'Selection Statistics',
    cursor: 'default',
  },
  slices: [createPluginSlice(createSelectionStatisticsSlice)],
  relatedPluginPanels: [
    {
      id: 'selectionStatistics',
      targetPlugin: 'auditLibrary',
      component: SelectionStatisticsPanel,
      order: 130,
    },
  ],
  toolDefinition: {
    order: 630,
  },
};

export type { SelectionStatisticsPluginSlice } from './slice';
