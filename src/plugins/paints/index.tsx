/**
 * Paints Plugin
 * Provides paint management functionality for canvas elements
 * 
 * Features:
 * - View all paints (colors, gradients, patterns) used in the canvas
 * - See usage statistics per paint
 * - Apply colors to selected elements
 * - Replace colors globally
 * - Merge duplicate paints
 */

import { Palette } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPaintsSlice } from './slice';
import { PaintsPanel } from './PaintsPanel';

const paintsSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createPaintsSlice(
    set as unknown as Parameters<typeof createPaintsSlice>[0],
    get as unknown as Parameters<typeof createPaintsSlice>[1],
    api as unknown as Parameters<typeof createPaintsSlice>[2]
  );
  return { state: slice };
};

/**
 * Determine if the panel should show
 * Shows when in select mode AND there are elements in the canvas
 */
const shouldShowPanel = (ctx: { activePlugin: string | null; totalElementsCount: number }) => {
  const isInSelectMode = !ctx.activePlugin || ctx.activePlugin === 'select';
  return isInSelectMode && ctx.totalElementsCount > 0;
};

export const paintsPlugin: PluginDefinition<CanvasStore> = {
  id: 'paints',
  metadata: {
    label: 'Paints',
    icon: Palette,
    cursor: 'default',
  },
  supportsMobile: true,
  slices: [paintsSliceFactory],

  sidebarPanels: [
    {
      key: 'paints',
      condition: shouldShowPanel,
      component: PaintsPanel,
    },
  ],
};
