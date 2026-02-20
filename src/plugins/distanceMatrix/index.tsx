import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Ruler } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createDistanceMatrixSlice } from './slice';
import { DistanceMatrixPanel } from './DistanceMatrixPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('distanceMatrix', ['distanceMatrix'], 'temporal');

export const distanceMatrixPlugin: PluginDefinition<CanvasStore> = {
  id: 'distanceMatrix',
  metadata: {
    label: 'Distance Matrix',
    icon: Ruler,
    cursor: 'default',
  },
  slices: [createPluginSlice(createDistanceMatrixSlice)],
  relatedPluginPanels: [
    {
      id: 'distance-matrix-panel',
      targetPlugin: 'auditLibrary',
      component: DistanceMatrixPanel,
      order: 10,
    },
  ],
};

export type { DistanceMatrixPluginSlice } from './slice';
