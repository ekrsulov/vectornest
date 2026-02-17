import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { MinimapPanel } from './MinimapPanel';
import { MinimapToggle } from './MinimapToggle';

export const minimapPlugin: PluginDefinition<CanvasStore> = {
  id: 'minimap',
  metadata: {
    label: 'Minimap',
    cursor: 'default',
  },
  supportsMobile: false,
  overlays: [
    {
      id: 'minimap-panel',
      placement: 'global',
      component: MinimapPanel,
    },
  ],
  actions: [
    {
      id: 'minimap-settings-toggle',
      placement: 'settings-panel',
      component: MinimapToggle,
    },
  ],
};
