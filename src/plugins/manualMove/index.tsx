import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MoveRight } from 'lucide-react';
import { ManualMovePanel } from './ManualMovePanel';
import { createSelectModePanel } from '../../utils/pluginFactories';

export const manualMovePlugin: PluginDefinition<CanvasStore> = {
  id: 'manualMove',
  metadata: {
    label: 'Manual Move',
    icon: MoveRight,
    cursor: 'default',
  },
  supportsMobile: true,
  sidebarPanels: [
    createSelectModePanel('manual-move-panel', ManualMovePanel,
      (ctx) => ctx.selectedElementsCount > 0
    ),
  ],
};
