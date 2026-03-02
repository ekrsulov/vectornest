import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Ruler } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createDistanceMatrixSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('distanceMatrix', ['distanceMatrix'], 'temporal');
const DistanceMatrixPanel = lazy(() =>
  import('./DistanceMatrixPanel').then((module) => ({ default: module.DistanceMatrixPanel }))
);

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
