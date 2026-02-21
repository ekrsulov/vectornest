import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Lasso } from 'lucide-react';
import { createLassoPluginSlice } from './slice';
import { LassoPanel } from './LassoPanel';
import { LassoOverlayWrapper } from './LassoOverlayWrapper';
import { LassoSelectionStrategy } from './LassoSelectionStrategy';
import { selectionStrategyRegistry } from '../../canvas/selection/SelectionStrategy';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSettingsPanel } from '../../utils/pluginFactories';
import './persistence';

const lassoSliceFactory = createPluginSlice(createLassoPluginSlice);
export const lassoPlugin: PluginDefinition<CanvasStore> = {
  id: 'lasso',
  metadata: {
    label: 'Lasso',
    icon: Lasso,
  },
  init: () => {
    // Register lasso selection strategy
    selectionStrategyRegistry.register(new LassoSelectionStrategy());

    // Return cleanup function
    return () => {
      selectionStrategyRegistry.unregister('lasso');
    };
  },
  slices: [lassoSliceFactory],
  sidebarPanels: [
    createSettingsPanel('lasso-panel', LassoPanel),
  ],
  canvasLayers: [
    {
      id: 'lasso-overlay',
      placement: 'midground',
      render: () => <LassoOverlayWrapper />,
    },
  ],
};
