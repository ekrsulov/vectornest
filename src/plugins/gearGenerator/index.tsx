import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGearGeneratorSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Cog } from 'lucide-react';

registerStateKeys('gearGenerator', ['gearGenerator'], 'temporal');

const GearGeneratorPanel = React.lazy(() =>
  import('./GearGeneratorPanel').then((module) => ({ default: module.GearGeneratorPanel }))
);

export const gearGeneratorPlugin: PluginDefinition<CanvasStore> = {
  id: 'gearGenerator',
  metadata: {
    label: 'Gear Generator',
    cursor: 'default',
    icon: Cog,
  },
  slices: [createPluginSlice(createGearGeneratorSlice)],
  relatedPluginPanels: [
    {
      id: 'gear-generator-panel',
      targetPlugin: 'generatorLibrary',
      component: GearGeneratorPanel,
      order: 20,
    },
  ],
};

export type { GearGeneratorPluginSlice } from './slice';
