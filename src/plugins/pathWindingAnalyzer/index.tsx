import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createPathWindingAnalyzerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('pathWindingAnalyzer', ['pathWindingAnalyzer'], 'temporal');

const PathWindingAnalyzerPanel = React.lazy(() =>
  import('./PathWindingAnalyzerPanel').then((module) => ({ default: module.PathWindingAnalyzerPanel }))
);

export const pathWindingAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'pathWindingAnalyzer',
  metadata: {
    label: 'Path Winding Analyzer',
    icon: RotateCcw,
    cursor: 'default',
  },
  slices: [createPluginSlice(createPathWindingAnalyzerSlice)],
  relatedPluginPanels: [
    {
      id: 'path-winding-analyzer-panel',
      targetPlugin: 'auditLibrary',
      component: PathWindingAnalyzerPanel,
      order: 10,
    },
  ],
};

export type { PathWindingAnalyzerPluginSlice } from './slice';
