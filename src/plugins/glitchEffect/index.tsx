import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Zap } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGlitchEffectSlice } from './slice';
import { GlitchEffectPanel } from './GlitchEffectPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('glitchEffect', ['glitchEffect'], 'temporal');

const glitchEffectSliceFactory = createPluginSlice(createGlitchEffectSlice);

export const glitchEffectPlugin: PluginDefinition<CanvasStore> = {
  id: 'glitchEffect',
  metadata: {
    label: 'Glitch Effect',
    icon: Zap,
    cursor: 'default',
  },
  supportsMobile: true,
  dependencies: ['filter'],
  slices: [glitchEffectSliceFactory],
  relatedPluginPanels: [
    {
      id: 'glitchEffect-panel',
      targetPlugin: 'generatorLibrary',
      component: GlitchEffectPanel,
      order: 180,
    },
  ],
};

export type { GlitchEffectPluginSlice } from './slice';
