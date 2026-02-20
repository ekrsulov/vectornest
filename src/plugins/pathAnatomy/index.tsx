import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { ScanSearch } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathAnatomySlice } from './slice';
import { PathAnatomyPanel } from './PathAnatomyPanel';
import { PathAnatomyOverlay } from './PathAnatomyOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathAnatomy', ['pathAnatomy'], 'both');

export const pathAnatomyPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathAnatomy',
  metadata: {
    label: 'Path Anatomy',
    icon: ScanSearch,
    cursor: 'default',
  },
  slices: [createPluginSlice(createPathAnatomySlice)],
  sidebarPanels: [
    createSettingsPanel('path-anatomy-settings', PathAnatomyPanel),
  ],
  canvasLayers: [
    {
      id: 'path-anatomy-overlay',
      placement: 'foreground',
      render: () => <PathAnatomyOverlay />,
    },
  ],
};

export type { PathAnatomyPluginSlice } from './slice';
