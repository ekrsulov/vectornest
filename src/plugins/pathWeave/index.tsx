import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Shuffle } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathWeaveSlice } from './slice';
import { PathWeavePanel } from './PathWeavePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathWeave', ['pathWeave'], 'temporal');

export const pathWeavePlugin: PluginDefinition<CanvasStore> = {
  id: 'pathWeave',
  metadata: {
    label: 'Path Weave',
    icon: Shuffle,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [createPluginSlice(createPathWeaveSlice)],
  relatedPluginPanels: [
    {
      id: 'path-weave-panel',
      targetPlugin: 'generatorLibrary',
      component: PathWeavePanel,
      order: 240,
    },
  ],
};

export type { PathWeavePluginSlice } from './slice';
