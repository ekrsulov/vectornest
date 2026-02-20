import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Layers } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createLayerDepthSlice } from './slice';
import { LayerDepthPanel } from './LayerDepthPanel';
import { LayerDepthOverlay } from './LayerDepthOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('layerDepth', ['layerDepth'], 'both');

export const layerDepthPlugin: PluginDefinition<CanvasStore> = {
  id: 'layerDepth',
  metadata: {
    label: 'Layer Depth Analyzer',
    icon: Layers,
    cursor: 'default',
  },
  slices: [createPluginSlice(createLayerDepthSlice)],
  sidebarPanels: [
    createSettingsPanel('layer-depth-settings', LayerDepthPanel),
  ],
  canvasLayers: [
    {
      id: 'layer-depth-overlay',
      placement: 'foreground',
      render: () => <LayerDepthOverlay />,
    },
  ],
};

export type { LayerDepthPluginSlice } from './slice';
