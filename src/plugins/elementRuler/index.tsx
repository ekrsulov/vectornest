import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Ruler } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createElementRulerSlice } from './slice';
import { ElementRulerPanel } from './ElementRulerPanel';
import { ElementRulerOverlay } from './ElementRulerOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('elementRuler', ['elementRuler'], 'both');

export const elementRulerPlugin: PluginDefinition<CanvasStore> = {
  id: 'elementRuler',
  metadata: {
    label: 'Element Ruler',
    icon: Ruler,
    cursor: 'default',
  },
  slices: [createPluginSlice(createElementRulerSlice)],
  sidebarPanels: [
    createSettingsPanel('element-ruler-settings', ElementRulerPanel),
  ],
  canvasLayers: [
    {
      id: 'element-ruler-overlay',
      placement: 'foreground',
      render: () => <ElementRulerOverlay />,
    },
  ],
};

export type { ElementRulerPluginSlice } from './slice';
