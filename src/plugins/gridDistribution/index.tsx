import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { LayoutGrid } from 'lucide-react';
import { GridDistributionPanel } from './GridDistributionPanel';
import { GridDistributionOverlay } from './GridDistributionOverlay';
import { createSelectModePanel } from '../../utils/pluginFactories';

export const gridDistributionPlugin: PluginDefinition<CanvasStore> = {
  id: 'gridDistribution',
  metadata: {
    label: 'Grid Distribution',
    icon: LayoutGrid,
    cursor: 'default',
  },
  supportsMobile: true,
  sidebarPanels: [
    createSelectModePanel('grid-distribution-panel', GridDistributionPanel,
      (ctx) => ctx.selectedElementsCount >= 2
    ),
  ],
  canvasLayers: [
    {
      id: 'grid-distribution-overlay',
      placement: 'foreground',
      render: () => <GridDistributionOverlay />,
    },
  ],
};
