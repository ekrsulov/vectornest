import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Palette } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createColorHarmonySlice } from './slice';
import { ColorHarmonyPanel } from './ColorHarmonyPanel';
import { createSelectModePanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('colorHarmony', ['colorHarmony'], 'temporal');

export const colorHarmonyPlugin: PluginDefinition<CanvasStore> = {
  id: 'colorHarmony',
  metadata: {
    label: 'Color Harmony',
    icon: Palette,
    cursor: 'default',
  },
  slices: [createPluginSlice(createColorHarmonySlice)],
  sidebarPanels: [
    createSelectModePanel('color-harmony-panel', ColorHarmonyPanel, (ctx) => ctx.selectedElementsCount > 0),
  ],
};

export type { ColorHarmonyPluginSlice } from './slice';
