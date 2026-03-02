import { LayoutGrid } from 'lucide-react';
import { lazy } from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
const GeneratorLibraryPanel = lazy(() =>
  import('./GeneratorLibraryPanel').then((module) => ({ default: module.GeneratorLibraryPanel }))
);

export const generatorLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'generatorLibrary',
  metadata: {
    label: 'Generator Library',
    icon: LayoutGrid,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  sidebarToolbarButtons: [
    {
      id: 'generator-library-panel-toggle',
      icon: LayoutGrid,
      label: 'Gen',
      order: 1,
    },
  ],
  sidebarPanels: [createToolPanel('generatorLibrary', GeneratorLibraryPanel)],
};
