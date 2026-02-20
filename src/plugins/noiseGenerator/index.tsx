import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Waves } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createNoiseGeneratorSlice } from './slice';
import { NoiseGeneratorPanel } from './NoiseGeneratorPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

// Keep noise settings across undo/redo so users don't lose their configuration
registerStateKeys('noiseGenerator', ['noiseGenerator'], 'temporal');

const noiseGeneratorSliceFactory = createPluginSlice(createNoiseGeneratorSlice);

export const noiseGeneratorPlugin: PluginDefinition<CanvasStore> = {
  id: 'noiseGenerator',
  metadata: {
    label: 'Noise Generator',
    icon: Waves,
    cursor: 'default',
  },
  supportsMobile: true,
  dependencies: ['filter'],
  slices: [noiseGeneratorSliceFactory],
  relatedPluginPanels: [
    {
      id: 'noise-generator-panel',
      targetPlugin: 'generatorLibrary',
      component: NoiseGeneratorPanel,
      order: 150,
    },
  ],
};

export type { NoiseGeneratorPluginSlice } from './slice';
