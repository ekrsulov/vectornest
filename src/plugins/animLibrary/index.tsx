import { Clapperboard } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { AnimLibraryPanel } from './AnimLibraryPanel';

export const animLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'animLibrary',
  metadata: {
    label: 'Animation Library',
    icon: Clapperboard,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  sidebarToolbarButtons: [
    {
      id: 'anim-library-panel-toggle',
      icon: Clapperboard,
      label: 'Anim',
      order: 2,
    },
  ],
  sidebarPanels: [createToolPanel('animLibrary', AnimLibraryPanel)],
};
