import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Waves } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createWaveDistortSlice } from './slice';
import { WaveDistortPanel } from './WaveDistortPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('waveDistort', ['waveDistort'], 'temporal');

export const waveDistortPlugin: PluginDefinition<CanvasStore> = {
  id: 'waveDistort',
  metadata: {
    label: 'Wave Distort',
    icon: Waves,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [createPluginSlice(createWaveDistortSlice)],
  relatedPluginPanels: [
    {
      id: 'wave-distort-panel',
      targetPlugin: 'generatorLibrary',
      component: WaveDistortPanel,
      order: 190,
    },
  ],
};

export type { WaveDistortPluginSlice } from './slice';
