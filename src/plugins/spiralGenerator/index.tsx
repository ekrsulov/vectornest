import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Disc3 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSpiralGeneratorSlice } from './slice';
import { SpiralGeneratorPanel } from './SpiralGeneratorPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('spiralGenerator', ['spiralGenerator'], 'temporal');

export const spiralGeneratorPlugin: PluginDefinition<CanvasStore> = {
  id: 'spiralGenerator',
  metadata: {
    label: 'Spiral Generator',
    icon: Disc3,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [createPluginSlice(createSpiralGeneratorSlice)],
  relatedPluginPanels: [
    {
      id: 'spiral-generator-panel',
      targetPlugin: 'generatorLibrary',
      component: SpiralGeneratorPanel,
      order: 100,
    },
  ],
};

export type { SpiralGeneratorPluginSlice } from './slice';
