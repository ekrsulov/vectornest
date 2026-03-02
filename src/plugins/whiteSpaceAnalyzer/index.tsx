import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createWhiteSpaceAnalyzerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('whiteSpaceAnalyzer', ['whiteSpaceAnalyzer'], 'temporal');
const WhiteSpaceAnalyzerPanel = lazy(() =>
  import('./WhiteSpaceAnalyzerPanel').then((module) => ({ default: module.WhiteSpaceAnalyzerPanel }))
);

export const whiteSpaceAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'whiteSpaceAnalyzer',
  metadata: {
    label: 'White Space Analyzer',
    cursor: 'default',
  },
  slices: [createPluginSlice(createWhiteSpaceAnalyzerSlice)],
  relatedPluginPanels: [
    {
      id: 'whiteSpaceAnalyzer',
      targetPlugin: 'auditLibrary',
      component: WhiteSpaceAnalyzerPanel,
      order: 120,
    },
  ],
  toolDefinition: {
    order: 610,
  },
};

export type { WhiteSpaceAnalyzerPluginSlice } from './slice';
