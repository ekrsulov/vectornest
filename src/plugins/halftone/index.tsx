import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { CircleDot } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createHalftoneSlice } from './slice';
import { HalftonePanel } from './HalftonePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('halftone', ['halftone'], 'temporal');

const halftoneSliceFactory = createPluginSlice(createHalftoneSlice);

export const halftonePlugin: PluginDefinition<CanvasStore> = {
  id: 'halftone',
  metadata: {
    label: 'Halftone Effect',
    icon: CircleDot,
    cursor: 'default',
  },
  supportsMobile: true,
  dependencies: ['filter'],
  slices: [halftoneSliceFactory],
  relatedPluginPanels: [
    {
      id: 'halftone-panel',
      targetPlugin: 'generatorLibrary',
      component: HalftonePanel,
      order: 160,
    },
  ],
};

export type { HalftonePluginSlice } from './slice';
