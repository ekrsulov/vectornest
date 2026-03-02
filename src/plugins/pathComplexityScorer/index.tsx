import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { BrainCircuit } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathComplexityScorerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathComplexityScorer', ['pathComplexityScorer'], 'temporal');
const PathComplexityScorerPanel = lazy(() =>
  import('./PathComplexityScorerPanel').then((module) => ({ default: module.PathComplexityScorerPanel }))
);

export const pathComplexityScorerPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathComplexityScorer',
  metadata: {
    label: 'Path Complexity Scorer',
    icon: BrainCircuit,
    cursor: 'default',
  },
  slices: [createPluginSlice(createPathComplexityScorerSlice)],
  relatedPluginPanels: [
    {
      id: 'path-complexity-scorer-panel',
      targetPlugin: 'auditLibrary',
      component: PathComplexityScorerPanel,
      order: 10,
    },
  ],
};

export type { PathComplexityScorerPluginSlice } from './slice';
