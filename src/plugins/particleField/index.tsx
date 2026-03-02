import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Sparkle } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createParticleFieldSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('particleField', ['particleField'], 'temporal');
const ParticleFieldPanel = lazy(() =>
  import('./ParticleFieldPanel').then((module) => ({ default: module.ParticleFieldPanel }))
);

const particleFieldSliceFactory = createPluginSlice(createParticleFieldSlice);

export const particleFieldPlugin: PluginDefinition<CanvasStore> = {
  id: 'particleField',
  metadata: {
    label: 'Particle Field',
    icon: Sparkle,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [particleFieldSliceFactory],
  relatedPluginPanels: [
    {
      id: 'particleField-panel',
      targetPlugin: 'generatorLibrary',
      component: ParticleFieldPanel,
      order: 130,
    },
  ],
};

export type { ParticleFieldPluginSlice } from './slice';
