import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createMazeGeneratorSlice } from './slice';
import { MazeGeneratorPanel } from './MazeGeneratorPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { LayoutGrid } from 'lucide-react';

registerStateKeys('mazeGenerator', ['mazeGenerator'], 'temporal');

export const mazeGeneratorPlugin: PluginDefinition<CanvasStore> = {
  id: 'mazeGenerator',
  metadata: {
    label: 'Maze Generator',
    cursor: 'default',
    icon: LayoutGrid,
  },
  slices: [createPluginSlice(createMazeGeneratorSlice)],
  relatedPluginPanels: [
    {
      id: 'maze-generator-panel',
      targetPlugin: 'generatorLibrary',
      component: MazeGeneratorPanel,
      order: 60,
    },
  ],
};

export type { MazeGeneratorPluginSlice } from './slice';
