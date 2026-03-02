import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { PenLine } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStrokeProfileAnalyzerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('strokeProfileAnalyzer', ['strokeProfileAnalyzer'], 'temporal');

const StrokeProfileAnalyzerPanel = React.lazy(() =>
  import('./StrokeProfileAnalyzerPanel').then((module) => ({ default: module.StrokeProfileAnalyzerPanel }))
);

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
