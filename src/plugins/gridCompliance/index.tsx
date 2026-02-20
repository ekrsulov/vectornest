import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Grid3X3 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGridComplianceSlice } from './slice';
import { GridCompliancePanel } from './GridCompliancePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('gridCompliance', ['gridCompliance'], 'temporal');

export const gridCompliancePlugin: PluginDefinition<CanvasStore> = {
  id: 'gridCompliance',
  metadata: {
    label: 'Grid Compliance',
    icon: Grid3X3,
    cursor: 'default',
  },
  slices: [createPluginSlice(createGridComplianceSlice)],
  relatedPluginPanels: [
    {
      id: 'grid-compliance',
      targetPlugin: 'auditLibrary',
      component: GridCompliancePanel,
      order: 50,
    },
  ],
};

export type { GridCompliancePluginSlice } from './slice';
