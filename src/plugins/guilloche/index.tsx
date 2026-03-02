import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGuillocheSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Fingerprint } from 'lucide-react';

registerStateKeys('guilloche', ['guilloche'], 'temporal');

const GuillochePanel = React.lazy(() =>
  import('./GuillochePanel').then((module) => ({ default: module.GuillochePanel }))
);

export const guillochePlugin: PluginDefinition<CanvasStore> = {
  id: 'guilloche',
  metadata: {
    label: 'Guilloche Pattern',
    cursor: 'default',
    icon: Fingerprint,
  },
  slices: [createPluginSlice(createGuillocheSlice)],
  relatedPluginPanels: [
    {
      id: 'guilloche-panel',
      targetPlugin: 'generatorLibrary',
      component: GuillochePanel,
      order: 50,
    },
  ],
};

export type { GuillochePluginSlice } from './slice';
