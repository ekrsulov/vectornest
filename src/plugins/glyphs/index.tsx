import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { ALargeSmall } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createGlyphsPluginSlice } from './slice';
import { createToolPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { GlyphsOverlay } from './GlyphsOverlay';

registerStateKeys('glyphs', ['glyphs'], 'temporal');

const GlyphsPanel = React.lazy(() =>
  import('./GlyphsPanel').then((module) => ({ default: module.GlyphsPanel }))
);

export const glyphsPlugin: PluginDefinition<CanvasStore> = {
  id: 'glyphs',
  metadata: {
    label: 'Glyphs',
    icon: ALargeSmall,
    cursor: 'default',
  },
  slices: [createPluginSlice(createGlyphsPluginSlice)],
  toolDefinition: {
    order: 50,
    toolGroup: 'advanced',
    isDisabled: (store) => {
      const { selectedIds, elements } = store;
      if (selectedIds.length !== 1) return true;
      const el = elements.find((e) => e.id === selectedIds[0]);
      return el?.type !== 'nativeText';
    },
  },
  modeConfig: {
    description: 'Edit individual glyph positions and rotation in text elements',
  },
  behaviorFlags: {
    preventsSelection: true,
    hideSelectionBbox: true,
  },
  expandablePanel: () => React.createElement(GlyphsPanel, null),
  sidebarPanels: [
    createToolPanel('glyphs', GlyphsPanel),
  ],
  canvasLayers: [
    {
      id: 'glyphs-overlay',
      placement: 'foreground',
      render: () => <GlyphsOverlay />,
    },
  ],
};

export type { GlyphsPluginSlice } from './slice';
