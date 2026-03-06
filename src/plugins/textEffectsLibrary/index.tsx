import { lazy } from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createTextEffectsLibrarySlice } from './slice';

const TextEffectsLibraryPanel = lazy(() =>
  import('./TextEffectsLibraryPanel').then((module) => ({
    default: module.TextEffectsLibraryPanel,
  })),
);

const textEffectsLibrarySliceFactory = createPluginSlice(createTextEffectsLibrarySlice);

export const textEffectsLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'textEffectsLibrary',
  metadata: {
    label: 'Text Effects',
    cursor: 'default',
  },
  slices: [textEffectsLibrarySliceFactory],
  relatedPluginPanels: [
    {
      id: 'text-effects-library-panel',
      targetPlugin: 'library',
      component: TextEffectsLibraryPanel,
      order: 10,
    },
  ],
};

export type { TextEffectsLibrarySlice } from './types';
