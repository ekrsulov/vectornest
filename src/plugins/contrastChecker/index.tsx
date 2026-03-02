import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { ScanEye } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createContrastCheckerSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('contrastChecker', ['contrastChecker'], 'temporal');

const ContrastCheckerPanel = React.lazy(() =>
  import('./ContrastCheckerPanel').then((module) => ({ default: module.ContrastCheckerPanel }))
);

export const contrastCheckerPlugin: PluginDefinition<CanvasStore> = {
  id: 'contrastChecker',
  metadata: {
    label: 'Contrast Checker',
    icon: ScanEye,
    cursor: 'default',
  },
  slices: [createPluginSlice(createContrastCheckerSlice)],
  relatedPluginPanels: [
    {
      id: 'contrast-checker-panel',
      targetPlugin: 'auditLibrary',
      component: ContrastCheckerPanel,
      order: 10,
    },
  ],
};

export type { ContrastCheckerPluginSlice } from './slice';
