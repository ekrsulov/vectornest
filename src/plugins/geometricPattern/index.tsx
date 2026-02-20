import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Hexagon } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGeometricPatternSlice } from './slice';
import { GeometricPatternPanel } from './GeometricPatternPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('geometricPattern', ['geometricPattern'], 'temporal');

export const geometricPatternPlugin: PluginDefinition<CanvasStore> = {
  id: 'geometricPattern',
  metadata: {
    label: 'Geometric Pattern',
    icon: Hexagon,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [createPluginSlice(createGeometricPatternSlice)],
  relatedPluginPanels: [
    {
      id: 'geometric-pattern-panel',
      targetPlugin: 'generatorLibrary',
      component: GeometricPatternPanel,
      order: 90,
    },
  ],
};

export type { GeometricPatternPluginSlice } from './slice';
