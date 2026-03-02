import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Axis3d } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createTangentVisualizerSlice } from './slice';
import { TangentVisualizerOverlay } from './TangentVisualizerOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('tangentVisualizer', ['tangentVisualizer'], 'both');

const TangentVisualizerPanel = React.lazy(() =>
  import('./TangentVisualizerPanel').then((module) => ({ default: module.TangentVisualizerPanel }))
);

export const tangentVisualizerPlugin: PluginDefinition<CanvasStore> = {
  id: 'tangentVisualizer',
  metadata: {
    label: 'Tangent Visualizer',
    icon: Axis3d,
    cursor: 'default',
  },
  slices: [createPluginSlice(createTangentVisualizerSlice)],
  sidebarPanels: [createSettingsPanel('tangentVisualizer', TangentVisualizerPanel)],
  canvasLayers: [
    {
      id: 'tangentVisualizerOverlay',
      placement: 'foreground',
      render: () => <TangentVisualizerOverlay />,
    },
  ],
};

export type { TangentVisualizerPluginSlice } from './slice';
