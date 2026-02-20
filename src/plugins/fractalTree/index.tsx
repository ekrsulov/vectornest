import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createFractalTreeSlice } from './slice';
import { FractalTreePanel } from './FractalTreePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { TreePine } from 'lucide-react';

registerStateKeys('fractalTree', ['fractalTree'], 'temporal');

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
