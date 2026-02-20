import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Crosshair } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createIntersectionDetectorSlice } from './slice';
import { IntersectionDetectorPanel } from './IntersectionDetectorPanel';
import { IntersectionOverlay } from './IntersectionOverlay';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { createSettingsPanel } from '../../utils/pluginFactories';

registerStateKeys('intersectionDetector', ['intersectionDetector'], 'temporal');

export const intersectionDetectorPlugin: PluginDefinition<CanvasStore> = {
  id: 'intersectionDetector',
  metadata: {
    label: 'Intersection Detector',
    icon: Crosshair,
    cursor: 'default',
  },
  slices: [createPluginSlice(createIntersectionDetectorSlice)],
  sidebarPanels: [createSettingsPanel('intersection-detector-settings', IntersectionDetectorPanel)],
  canvasLayers: [
    {
      id: 'intersection-overlay',
      placement: 'foreground',
      render: () => <IntersectionOverlay />,
    },
  ],
};

export type { IntersectionDetectorPluginSlice } from './slice';
