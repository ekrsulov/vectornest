import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCelticKnotSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Infinity as InfinityIcon } from 'lucide-react';

registerStateKeys('celticKnot', ['celticKnot'], 'temporal');

const CelticKnotPanel = React.lazy(() =>
  import('./CelticKnotPanel').then((module) => ({ default: module.CelticKnotPanel }))
);

export const celticKnotPlugin: PluginDefinition<CanvasStore> = {
  id: 'celticKnot',
  metadata: {
    label: 'Celtic Knot',
    cursor: 'default',
    icon: InfinityIcon,
  },
  slices: [createPluginSlice(createCelticKnotSlice)],
  relatedPluginPanels: [
    {
      id: 'celtic-knot-panel',
      targetPlugin: 'generatorLibrary',
      component: CelticKnotPanel,
      order: 30,
    },
  ],
};

export type { CelticKnotPluginSlice } from './slice';
