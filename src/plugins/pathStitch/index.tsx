import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathStitchSlice } from './slice';
import { PathStitchPanel } from './PathStitchPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Cable } from 'lucide-react';

registerStateKeys('pathStitch', ['pathStitch'], 'temporal');

export const pathStitchPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathStitch',
  metadata: {
    label: 'Path Stitch',
    cursor: 'default',
    icon: Cable,
  },
  slices: [createPluginSlice(createPathStitchSlice)],
  relatedPluginPanels: [
    {
      id: 'path-stitch-panel',
      targetPlugin: 'generatorLibrary',
      component: PathStitchPanel,
      order: 250,
    },
  ],
};

export type { PathStitchPluginSlice } from './slice';
