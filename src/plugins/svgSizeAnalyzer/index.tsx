import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { FileBarChart } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSvgSizeAnalyzerSlice } from './slice';
import { SvgSizeAnalyzerPanel } from './SvgSizeAnalyzerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('svgSizeAnalyzer', ['svgSizeAnalyzer'], 'temporal');

export const svgSizeAnalyzerPlugin: PluginDefinition<CanvasStore> = {
  id: 'svgSizeAnalyzer',
  metadata: {
    label: 'SVG Size Analyzer',
    icon: FileBarChart,
    cursor: 'default',
  },
  slices: [createPluginSlice(createSvgSizeAnalyzerSlice)],
  relatedPluginPanels: [
    {
      id: 'svg-size-analyzer-panel',
      targetPlugin: 'auditLibrary',
      component: SvgSizeAnalyzerPanel,
      order: 40,
    },
  ],
};

export type { SvgSizeAnalyzerPluginSlice } from './slice';
