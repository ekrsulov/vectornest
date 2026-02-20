import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Sparkles } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSymmetryDrawSlice } from './slice';
import { SymmetryDrawPanel } from './SymmetryDrawPanel';
import { SymmetryOverlay } from './SymmetryOverlay';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('symmetryDraw', ['symmetryDraw'], 'both');

const symmetryDrawSliceFactory = createPluginSlice(createSymmetryDrawSlice);

export const symmetryDrawPlugin: PluginDefinition<CanvasStore> = {
  id: 'symmetryDraw',
  metadata: {
    label: 'Symmetry Draw',
    icon: Sparkles,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [symmetryDrawSliceFactory],
  sidebarPanels: [
    createSettingsPanel('symmetry-draw-settings', SymmetryDrawPanel),
  ],
  canvasLayers: [
    {
      id: 'symmetry-draw-overlay',
      placement: 'foreground',
      render: () => <SymmetryOverlay />,
    },
  ],
};

export type { SymmetryDrawPluginSlice } from './slice';
