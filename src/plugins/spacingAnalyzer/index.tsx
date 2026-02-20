import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Space } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSpacingAnalyzerSlice } from './slice';
import { SpacingAnalyzerPanel } from './SpacingAnalyzerPanel';
import { SpacingAnalyzerOverlay } from './SpacingAnalyzerOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('spacingAnalyzer', ['spacingAnalyzer'], 'both');

export const spacingAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'spacingAnalyzer',
  metadata: {
    label: 'Spacing Analyzer',
    icon: Space,
    cursor: 'default',
  },
  slices: [createPluginSlice(createSpacingAnalyzerSlice)],
  sidebarPanels: [
    createSettingsPanel('spacing-analyzer-settings', SpacingAnalyzerPanel),
  ],
  canvasLayers: [
    {
      id: 'spacing-analyzer-overlay',
      placement: 'foreground',
      render: () => <SpacingAnalyzerOverlay />,
    },
  ],
};

export type { SpacingAnalyzerPluginSlice } from './slice';
