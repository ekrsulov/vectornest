import { lazy } from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createTextPathLibrarySlice } from './slice';
import { useTextPathPlacementHook } from './hooks/useTextPathPlacementHook';

const TextPathLibraryPanel = lazy(() =>
  import('./TextPathLibraryPanel').then((module) => ({ default: module.TextPathLibraryPanel }))
);

const textPathLibrarySliceFactory = createPluginSlice(createTextPathLibrarySlice);

export const textPathLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'textPathLibrary',
  metadata: {
    label: 'Textpath',
    cursor: 'default',
  },
  slices: [textPathLibrarySliceFactory],
  hooks: [
    {
      id: 'textpath-placement-hook',
      hook: useTextPathPlacementHook,
      global: true,
    },
  ],
  relatedPluginPanels: [
    {
      id: 'textpath-library-panel',
      targetPlugin: 'library',
      component: TextPathLibraryPanel,
      order: 9,
    },
  ],
};

export type { TextPathLibrarySlice } from './slice';
