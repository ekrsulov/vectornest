import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Crosshair } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCompositionGuidesSlice } from './slice';
import { CompositionGuidesPanel } from './CompositionGuidesPanel';
import { CompositionGuidesOverlay } from './CompositionGuidesOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('compositionGuides', ['compositionGuides'], 'both');

export const compositionGuidesPlugin: PluginDefinition<CanvasStore> = {
  id: 'compositionGuides',
  metadata: {
    label: 'Composition Guides',
    icon: Crosshair,
    cursor: 'default',
  },
  slices: [createPluginSlice(createCompositionGuidesSlice)],
  sidebarPanels: [
    createSettingsPanel('composition-guides-settings', CompositionGuidesPanel),
  ],
  canvasLayers: [
    {
      id: 'composition-guides-overlay',
      placement: 'background',
      render: () => <CompositionGuidesOverlay />,
    },
  ],
};

export type { CompositionGuidesPluginSlice } from './slice';
