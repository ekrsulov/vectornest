import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Pipette } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createColorPaletteSlice } from './slice';
import { ColorPalettePanel } from './ColorPalettePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('colorPalette', ['colorPalette'], 'temporal');

export const colorPalettePlugin: PluginDefinition<CanvasStore> = {
  id: 'colorPalette',
  metadata: {
    label: 'Color Palette',
    icon: Pipette,
    cursor: 'default',
  },
  slices: [createPluginSlice(createColorPaletteSlice)],
  relatedPluginPanels: [
    {
      id: 'color-palette-panel',
      targetPlugin: 'auditLibrary',
      component: ColorPalettePanel,
      order: 20,
    },
  ],
};

export type { ColorPalettePluginSlice } from './slice';
