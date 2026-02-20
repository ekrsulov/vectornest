import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { GitMerge } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathMorphSlice } from './slice';
import { PathMorphPanel } from './PathMorphPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathMorph', ['pathMorph'], 'temporal');

const pathMorphSliceFactory = createPluginSlice(createPathMorphSlice);

export const pathMorphPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathMorph',
  metadata: {
    label: 'Path Morph',
    icon: GitMerge,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [pathMorphSliceFactory],
  relatedPluginPanels: [
    {
      id: 'path-morph-panel',
      targetPlugin: 'generatorLibrary',
      component: PathMorphPanel,
      order: 110,
    },
  ],
};

export type { PathMorphPluginSlice } from './slice';
