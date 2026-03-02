import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Radar } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSymmetryDetectorSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('symmetryDetector', ['symmetryDetector'], 'temporal');

const SymmetryDetectorPanel = React.lazy(() =>
  import('./SymmetryDetectorPanel').then((module) => ({ default: module.SymmetryDetectorPanel }))
);

export const symmetryDetectorPlugin: PluginDefinition<CanvasStore> = {
  id: 'symmetryDetector',
  metadata: {
    label: 'Symmetry Detector',
    icon: Radar,
    cursor: 'default',
  },
  slices: [createPluginSlice(createSymmetryDetectorSlice)],
  relatedPluginPanels: [
    {
      id: 'symmetry-detector',
      targetPlugin: 'auditLibrary',
      component: SymmetryDetectorPanel,
      order: 100,
    },
  ],
};

export type { SymmetryDetectorPluginSlice } from './slice';
