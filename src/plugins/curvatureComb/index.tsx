import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Activity } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCurvatureCombSlice } from './slice';
import { CurvatureCombPanel } from './CurvatureCombPanel';
import { CurvatureCombOverlay } from './CurvatureCombOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('curvatureComb', ['curvatureComb'], 'both');

export const curvatureCombPlugin: PluginDefinition<CanvasStore> = {
  id: 'curvatureComb',
  metadata: {
    label: 'Curvature Comb',
    icon: Activity,
    cursor: 'default',
  },
  slices: [createPluginSlice(createCurvatureCombSlice)],
  sidebarPanels: [
    createSettingsPanel('curvature-comb-settings', CurvatureCombPanel),
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
