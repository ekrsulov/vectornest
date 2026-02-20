import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { LayoutGrid } from 'lucide-react';
import { GridDistributionPanel } from './GridDistributionPanel';
import { GridDistributionOverlay } from './GridDistributionOverlay';

export const gridDistributionPlugin: PluginDefinition<CanvasStore> = {
  id: 'gridDistribution',
  metadata: {
    label: 'Grid Distribution',
    icon: LayoutGrid,
    cursor: 'default',
  },
  supportsMobile: true,
  relatedPluginPanels: [
    {
      id: 'grid-distribution-panel',
      targetPlugin: 'generatorLibrary',
      component: GridDistributionPanel,
      order: 220,
    },
  ],
  canvasLayers: [
    {
      id: 'grid-distribution-overlay',
      placement: 'foreground',
      render: () => <GridDistributionOverlay />,
    },
  ],
};
