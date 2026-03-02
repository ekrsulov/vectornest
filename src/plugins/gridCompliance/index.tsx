import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Grid3X3 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGridComplianceSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('gridCompliance', ['gridCompliance'], 'temporal');
const GridCompliancePanel = lazy(() =>
  import('./GridCompliancePanel').then((module) => ({ default: module.GridCompliancePanel }))
);

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
