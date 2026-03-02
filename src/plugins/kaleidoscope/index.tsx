import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Flower2 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createKaleidoscopeSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('kaleidoscope', ['kaleidoscope'], 'temporal');

const KaleidoscopePanel = React.lazy(() =>
  import('./KaleidoscopePanel').then((module) => ({ default: module.KaleidoscopePanel }))
);

export const kaleidoscopePlugin: PluginDefinition<CanvasStore> = {
  id: 'kaleidoscope',
  metadata: {
    label: 'Kaleidoscope',
    icon: Flower2,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [createPluginSlice(createKaleidoscopeSlice)],
  relatedPluginPanels: [
    {
      id: 'kaleidoscope-panel',
      targetPlugin: 'generatorLibrary',
      component: KaleidoscopePanel,
      order: 120,
    },
  ],
};

export type { KaleidoscopePluginSlice } from './slice';
