import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Activity } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCurvatureCombSlice } from './slice';
import { CurvatureCombOverlay } from './CurvatureCombOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('curvatureComb', ['curvatureComb'], 'both');

const CurvatureCombPanel = React.lazy(() =>
  import('./CurvatureCombPanel').then((module) => ({ default: module.CurvatureCombPanel }))
);

export const curvatureCombPlugin: PluginDefinition<CanvasStore> = {
  id: 'curvatureComb',
  metadata: {
    label: 'Curvature Comb',
    icon: Activity,
    cursor: 'default',
  },
  slices: [createPluginSlice(createCurvatureCombSlice)],
  sidebarPanels: [
    createSettingsPanel('curvature-comb-settings', CurvatureCombPanel, { title: 'Path Curvature Comb' }),
  ],
  canvasLayers: [
    {
      id: 'curvature-comb-overlay',
      placement: 'foreground',
      render: () => <CurvatureCombOverlay />,
    },
  ],
};

export type { CurvatureCombPluginSlice } from './slice';
