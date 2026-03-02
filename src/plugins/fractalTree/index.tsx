import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createFractalTreeSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { TreePine } from 'lucide-react';

registerStateKeys('fractalTree', ['fractalTree'], 'temporal');
const FractalTreePanel = lazy(() =>
  import('./FractalTreePanel').then((module) => ({ default: module.FractalTreePanel }))
);

export const fractalTreePlugin: PluginDefinition<CanvasStore> = {
  id: 'fractalTree',
  metadata: {
    label: 'Fractal Tree',
    cursor: 'default',
    icon: TreePine,
  },
  slices: [createPluginSlice(createFractalTreeSlice)],
  relatedPluginPanels: [
    {
      id: 'fractal-tree-panel',
      targetPlugin: 'generatorLibrary',
      component: FractalTreePanel,
      order: 80,
    },
  ],
};

export type { FractalTreePluginSlice } from './slice';
