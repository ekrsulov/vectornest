import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Palette } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGradientMapperSlice } from './slice';
import { GradientMapperPanel } from './GradientMapperPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('gradientMapper', ['gradientMapper'], 'temporal');

export const gradientMapperPlugin: PluginDefinition<CanvasStore> = {
  id: 'gradientMapper',
  metadata: {
    label: 'Gradient Mapper',
    icon: Palette,
    cursor: 'default',
  },
  slices: [createPluginSlice(createGradientMapperSlice)],
  relatedPluginPanels: [
    {
      id: 'gradient-mapper-panel',
      targetPlugin: 'auditLibrary',
      component: GradientMapperPanel,
      order: 10,
    },
  ],
};

export type { GradientMapperPluginSlice } from './slice';
