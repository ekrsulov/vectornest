import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MoveRight } from 'lucide-react';
import { ManualMovePanel } from './ManualMovePanel';

export const manualMovePlugin: PluginDefinition<CanvasStore> = {
  id: 'manualMove',
  metadata: {
    label: 'Manual Move',
    icon: MoveRight,
    cursor: 'default',
  },
  supportsMobile: true,
  relatedPluginPanels: [
    {
      id: 'manual-move-panel',
      targetPlugin: 'generatorLibrary',
      component: ManualMovePanel,
      order: 205,
    },
  ],
};
