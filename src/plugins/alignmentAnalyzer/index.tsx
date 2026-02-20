import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { AlignVerticalSpaceAround } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createAlignmentAnalyzerSlice } from './slice';
import { AlignmentAnalyzerPanel } from './AlignmentAnalyzerPanel';
import { AlignmentAnalyzerOverlay } from './AlignmentAnalyzerOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('alignmentAnalyzer', ['alignmentAnalyzer'], 'both');

export const alignmentAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'alignmentAnalyzer',
  metadata: {
    label: 'Alignment Analyzer',
    icon: AlignVerticalSpaceAround,
    cursor: 'default',
  },
  slices: [createPluginSlice(createAlignmentAnalyzerSlice)],
  sidebarPanels: [
    createSettingsPanel('alignment-analyzer-settings', AlignmentAnalyzerPanel),
  ],
  canvasLayers: [
    {
      id: 'alignment-analyzer-overlay',
      placement: 'foreground',
      render: () => <AlignmentAnalyzerOverlay />,
    },
  ],
};

export type { AlignmentAnalyzerPluginSlice } from './slice';
