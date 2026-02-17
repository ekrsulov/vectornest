import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSelectModePanel } from '../../utils/pluginFactories';
import { pluginManager } from '../../utils/pluginManager';
import { createOpticalAlignmentSlice } from './slice';
import type { OpticalAlignmentSlice } from './slice';
import { OpticalAlignmentPanel } from './OpticalAlignmentPanel';
import { Target } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';

type OpticalAlignmentStore = CanvasStore & OpticalAlignmentSlice;

const opticalAlignmentSliceFactory = createPluginSlice(createOpticalAlignmentSlice);
export const opticalAlignmentPlugin: PluginDefinition<CanvasStore> = {
  id: 'opticalAlignment',
  metadata: {
    label: 'Optical Alignment',
    cursor: 'default',
  },
  init: (_context) => {
    return () => { };
  },
  contextMenuActions: [
    {
      id: 'apply-visual-center',
      action: (context) => {
        if (context.type !== 'multiselection') return null;

        // Original logic:
        // const canAlign = canPerformOpticalAlignment?.() ?? false;
        // if (!canAlign) return null;

        // We need to check if we can perform optical alignment.
        // This logic was in the store slice.
        // We can access it via the store API.

        const store = pluginManager.requireStoreApi();
        const state = store.getState() as OpticalAlignmentStore;

        // Assuming the slice adds these methods to the store state
        if (!state.canPerformOpticalAlignment?.()) return null;

        return {
          id: 'apply-visual-center',
          label: 'Apply Visual Center',
          icon: Target,
          onClick: async () => {
            await state.calculateOpticalAlignment?.();
            state.applyOpticalAlignment?.();
          }
        };
      }
    }
  ],
  slices: [opticalAlignmentSliceFactory],
  sidebarPanels: [
    createSelectModePanel('optical-alignment', OpticalAlignmentPanel,
      (ctx) => ctx.canPerformOpticalAlignment
    ),
  ],
};

export type { OpticalAlignmentSlice };
export { OpticalAlignmentPanel };
