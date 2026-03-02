import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { GitMerge } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathMorphSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathMorph', ['pathMorph'], 'temporal');

const pathMorphSliceFactory = createPluginSlice(createPathMorphSlice);
const PathMorphPanel = React.lazy(() =>
  import('./PathMorphPanel').then((module) => ({ default: module.PathMorphPanel }))
);

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
