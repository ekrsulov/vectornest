import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Box } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createBboxVisualizerSlice } from './slice';
import { BboxVisualizerPanel } from './BboxVisualizerPanel';
import { BboxVisualizerOverlay } from './BboxVisualizerOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('bboxVisualizer', ['bboxVisualizer'], 'both');

export const bboxVisualizerPlugin: PluginDefinition<CanvasStore> = {
  id: 'bboxVisualizer',
  metadata: {
    label: 'Bounding Box Visualizer',
    icon: Box,
    cursor: 'default',
  },
  slices: [createPluginSlice(createBboxVisualizerSlice)],
  sidebarPanels: [
    createSettingsPanel('bbox-visualizer-settings', BboxVisualizerPanel),
  ],
  canvasLayers: [
    {
      id: 'bbox-visualizer-overlay',
      placement: 'foreground',
      render: () => <BboxVisualizerOverlay />,
    },
  ],
};

export type { BboxVisualizerPluginSlice } from './slice';
