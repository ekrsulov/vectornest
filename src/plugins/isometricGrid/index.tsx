import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createIsometricGridSlice } from './slice';
import { IsometricGridPanel } from './IsometricGridPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Box } from 'lucide-react';

registerStateKeys('isometricGrid', ['isometricGrid'], 'temporal');

export const isometricGridPlugin: PluginDefinition<CanvasStore> = {
  id: 'isometricGrid',
  metadata: {
    label: 'Isometric Grid',
    cursor: 'default',
    icon: Box,
  },
  slices: [createPluginSlice(createIsometricGridSlice)],
  relatedPluginPanels: [
    {
      id: 'isometric-grid-panel',
      targetPlugin: 'generatorLibrary',
      component: IsometricGridPanel,
      order: 40,
    },
  ],
};

export type { IsometricGridPluginSlice } from './slice';
