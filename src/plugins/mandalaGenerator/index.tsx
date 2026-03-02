import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createMandalaGeneratorSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Flower2 } from 'lucide-react';

registerStateKeys('mandalaGenerator', ['mandalaGenerator'], 'temporal');
const MandalaGeneratorPanel = lazy(() =>
  import('./MandalaGeneratorPanel').then((module) => ({ default: module.MandalaGeneratorPanel }))
);

export const mandalaGeneratorPlugin: PluginDefinition<CanvasStore> = {
  id: 'mandalaGenerator',
  metadata: {
    label: 'Mandala Generator',
    cursor: 'default',
    icon: Flower2,
  },
  slices: [createPluginSlice(createMandalaGeneratorSlice)],
  relatedPluginPanels: [
    {
      id: 'mandala-generator-panel',
      targetPlugin: 'generatorLibrary',
      component: MandalaGeneratorPanel,
      order: 10,
    },
  ],
};

export type { MandalaGeneratorPluginSlice } from './slice';
