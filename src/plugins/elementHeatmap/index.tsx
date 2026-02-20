import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Flame } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createElementHeatmapSlice } from './slice';
import { ElementHeatmapPanel } from './ElementHeatmapPanel';
import { ElementHeatmapOverlay } from './ElementHeatmapOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('elementHeatmap', ['elementHeatmap'], 'both');

export const elementHeatmapPlugin: PluginDefinition<CanvasStore> = {
  id: 'elementHeatmap',
  metadata: {
    label: 'Element Heatmap',
    icon: Flame,
    cursor: 'default',
  },
  slices: [createPluginSlice(createElementHeatmapSlice)],
  sidebarPanels: [createSettingsPanel('elementHeatmap', ElementHeatmapPanel)],
  canvasLayers: [
    {
      id: 'elementHeatmapOverlay',
      placement: 'background',
      render: () => <ElementHeatmapOverlay />,
    },
  ],
};

export type { ElementHeatmapPluginSlice } from './slice';
