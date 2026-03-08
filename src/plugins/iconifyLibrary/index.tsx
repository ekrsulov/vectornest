import { lazy } from 'react';
import { Shapes } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createIconifyLibrarySlice } from './slice';
import { useIconifyPlacementHook } from './hooks/useIconifyPlacementHook';

const IconifyLibraryPanel = lazy(() =>
  import('./IconifyLibraryPanel').then((module) => ({
    default: module.IconifyLibraryPanel,
  })),
);

const iconifyLibrarySliceFactory = createPluginSlice(createIconifyLibrarySlice);

export const iconifyLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'iconifyLibrary',
  metadata: {
    label: 'Iconify',
    icon: Shapes,
    cursor: 'default',
  },
  slices: [iconifyLibrarySliceFactory],
  hooks: [
    {
      id: 'iconify-placement-hook',
      hook: useIconifyPlacementHook,
      global: true,
    },
  ],
  relatedPluginPanels: [
    {
      id: 'iconify-library-panel',
      targetPlugin: 'library',
      component: IconifyLibraryPanel,
      order: 1,
    },
  ],
};

export type { IconifyLibrarySlice } from './slice';
