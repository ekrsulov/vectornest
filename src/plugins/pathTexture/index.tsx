import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { Brush } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathTextureSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathTexture', ['pathTexture'], 'temporal');
const PathTexturePanel = lazy(() =>
  import('./PathTexturePanel').then((module) => ({ default: module.PathTexturePanel }))
);

const pathTextureSliceFactory = createPluginSlice(createPathTextureSlice);

export const pathTexturePlugin: PluginDefinition<CanvasStore> = {
  id: 'pathTexture',
  metadata: {
    label: 'Path Texture',
    icon: Brush,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [pathTextureSliceFactory],
  relatedPluginPanels: [
    {
      id: 'pathTexture-panel',
      targetPlugin: 'generatorLibrary',
      component: PathTexturePanel,
      order: 140,
    },
  ],
};

export type { PathTexturePluginSlice } from './slice';
