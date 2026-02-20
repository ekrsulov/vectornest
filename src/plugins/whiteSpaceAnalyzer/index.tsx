import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createWhiteSpaceAnalyzerSlice } from './slice';
import { WhiteSpaceAnalyzerPanel } from './WhiteSpaceAnalyzerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('whiteSpaceAnalyzer', ['whiteSpaceAnalyzer'], 'temporal');

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
