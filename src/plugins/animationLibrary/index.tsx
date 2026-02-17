import { Sparkles } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createAnimationLibrarySlice } from './slice';
import { AnimationLibraryPanel } from './AnimationLibraryPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';
import './registerFilterDefs'; // Register filter defs contribution

registerStateKeys('animationLibrary', ['animationPresets'], 'persist');

const animationLibrarySliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createAnimationLibrarySlice(set, get, api),
});

export const animationLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'animationLibrary',
  metadata: {
    label: 'Animation Library',
    icon: Sparkles,
    cursor: 'default',
  },
  slices: [animationLibrarySliceFactory],
  relatedPluginPanels: [
    {
      id: 'animation-library-panel',
      targetPlugin: 'library',
      component: AnimationLibraryPanel,
      order: 9,
    },
  ],
};
