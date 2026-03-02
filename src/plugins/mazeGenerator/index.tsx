import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createMazeGeneratorSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { LayoutGrid } from 'lucide-react';

registerStateKeys('mazeGenerator', ['mazeGenerator'], 'temporal');
const MazeGeneratorPanel = lazy(() =>
  import('./MazeGeneratorPanel').then((module) => ({ default: module.MazeGeneratorPanel }))
);

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
