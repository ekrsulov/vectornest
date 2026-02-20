import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Brush } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathTextureSlice } from './slice';
import { PathTexturePanel } from './PathTexturePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathTexture', ['pathTexture'], 'temporal');

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
