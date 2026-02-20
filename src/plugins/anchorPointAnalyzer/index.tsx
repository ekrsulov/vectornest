import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createAnchorPointAnalyzerSlice } from './slice';
import { AnchorPointAnalyzerPanel } from './AnchorPointAnalyzerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('anchorPointAnalyzer', ['anchorPointAnalyzer'], 'temporal');

export const anchorPointAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'anchorPointAnalyzer',
  metadata: {
    label: 'Anchor Point Analyzer',
    cursor: 'default',
  },
  slices: [createPluginSlice(createAnchorPointAnalyzerSlice)],
  relatedPluginPanels: [
    {
      id: 'anchorPointAnalyzer',
      targetPlugin: 'auditLibrary',
      component: AnchorPointAnalyzerPanel,
      order: 140,
    },
  ],
  toolDefinition: {
    order: 640,
  },
};

export type { AnchorPointAnalyzerPluginSlice } from './slice';
