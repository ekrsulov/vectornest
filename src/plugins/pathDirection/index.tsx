import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Navigation } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathDirectionSlice } from './slice';
import { PathDirectionPanel } from './PathDirectionPanel';
import { PathDirectionOverlay } from './PathDirectionOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathDirection', ['pathDirection'], 'both');

export const pathDirectionPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathDirection',
  metadata: {
    label: 'Path Direction',
    icon: Navigation,
    cursor: 'default',
  },
  slices: [createPluginSlice(createPathDirectionSlice)],
  sidebarPanels: [
    createSettingsPanel('path-direction-settings', PathDirectionPanel),
  ],
  canvasLayers: [
    {
      id: 'path-direction-overlay',
      placement: 'foreground',
      render: () => <PathDirectionOverlay />,
    },
  ],
};

export type { PathDirectionPluginSlice } from './slice';
