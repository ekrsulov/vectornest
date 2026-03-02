import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Tag } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createNamingManagerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('namingManager', ['namingManager'], 'temporal');
const NamingManagerPanel = lazy(() =>
  import('./NamingManagerPanel').then((module) => ({ default: module.NamingManagerPanel }))
);

export const namingManagerPlugin: PluginDefinition<CanvasStore> = {
  id: 'namingManager',
  metadata: {
    label: 'Naming Manager',
    icon: Tag,
    cursor: 'default',
  },
  slices: [createPluginSlice(createNamingManagerSlice)],
  relatedPluginPanels: [
    {
      id: 'naming-manager',
      targetPlugin: 'auditLibrary',
      component: NamingManagerPanel,
      order: 150,
    },
  ],
};

export type { NamingManagerPluginSlice } from './slice';
