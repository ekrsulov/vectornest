import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { GitCompareArrows } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createElementComparatorSlice } from './slice';
import { ElementComparatorPanel } from './ElementComparatorPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('elementComparator', ['elementComparator'], 'temporal');

export const elementComparatorPlugin: PluginDefinition<CanvasStore> = {
  id: 'elementComparator',
  metadata: {
    label: 'Element Comparator',
    icon: GitCompareArrows,
    cursor: 'default',
  },
  slices: [createPluginSlice(createElementComparatorSlice)],
  relatedPluginPanels: [
    {
      id: 'element-comparator',
      targetPlugin: 'auditLibrary',
      component: ElementComparatorPanel,
      order: 110,
    },
  ],
};

export type { ElementComparatorPluginSlice } from './slice';
