import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Search } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createElementInspectorSlice } from './slice';
import { ElementInspectorPanel } from './ElementInspectorPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('elementInspector', ['elementInspector'], 'temporal');

export const elementInspectorPlugin: PluginDefinition<CanvasStore> = {
  id: 'elementInspector',
  metadata: {
    label: 'Element Inspector',
    icon: Search,
    cursor: 'default',
  },
  slices: [createPluginSlice(createElementInspectorSlice)],
  relatedPluginPanels: [
    {
      id: 'element-inspector-panel',
      targetPlugin: 'auditLibrary',
      component: ElementInspectorPanel,
      order: 30,
    },
  ],
};

export type { ElementInspectorPluginSlice } from './slice';
