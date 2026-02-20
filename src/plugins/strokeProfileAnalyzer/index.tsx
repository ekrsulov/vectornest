import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { PenLine } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStrokeProfileAnalyzerSlice } from './slice';
import { StrokeProfileAnalyzerPanel } from './StrokeProfileAnalyzerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('strokeProfileAnalyzer', ['strokeProfileAnalyzer'], 'temporal');

export const strokeProfileAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'strokeProfileAnalyzer',
  metadata: {
    label: 'Stroke Profile Analyzer',
    icon: PenLine,
    cursor: 'default',
  },
  slices: [createPluginSlice(createStrokeProfileAnalyzerSlice)],
  relatedPluginPanels: [
    {
      id: 'stroke-profile-analyzer-panel',
      targetPlugin: 'auditLibrary',
      component: StrokeProfileAnalyzerPanel,
      order: 10,
    },
  ],
};

export type { StrokeProfileAnalyzerPluginSlice } from './slice';
