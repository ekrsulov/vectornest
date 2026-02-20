import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { BrainCircuit } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathComplexityScorerSlice } from './slice';
import { PathComplexityScorerPanel } from './PathComplexityScorerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathComplexityScorer', ['pathComplexityScorer'], 'temporal');

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
