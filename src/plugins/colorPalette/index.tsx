import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Pipette } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createColorPaletteSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('colorPalette', ['colorPalette'], 'temporal');

const ColorPalettePanel = React.lazy(() =>
  import('./ColorPalettePanel').then((module) => ({ default: module.ColorPalettePanel }))
);

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
