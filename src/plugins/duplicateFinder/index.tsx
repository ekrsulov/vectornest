import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Copy } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createDuplicateFinderSlice } from './slice';
import { DuplicateFinderPanel } from './DuplicateFinderPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('duplicateFinder', ['duplicateFinder'], 'temporal');

export const duplicateFinderPlugin: PluginDefinition<CanvasStore> = {
  id: 'duplicateFinder',
  metadata: {
    label: 'Duplicate Finder',
    icon: Copy,
    cursor: 'default',
  },
  slices: [createPluginSlice(createDuplicateFinderSlice)],
  relatedPluginPanels: [
    {
      id: 'duplicate-finder',
      targetPlugin: 'auditLibrary',
      component: DuplicateFinderPanel,
      order: 60,
    },
  ],
};

export type { DuplicateFinderPluginSlice } from './slice';
