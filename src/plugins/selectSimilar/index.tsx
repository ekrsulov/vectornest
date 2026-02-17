import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Filter } from 'lucide-react';
import { SelectSimilarPanel } from './SelectSimilarPanel';
import { createSelectSimilarSlice } from './slice';

const selectSimilarSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createSelectSimilarSlice(
    set as unknown as Parameters<typeof createSelectSimilarSlice>[0],
    get as unknown as Parameters<typeof createSelectSimilarSlice>[1],
    api as unknown as Parameters<typeof createSelectSimilarSlice>[2]
  );
  return { state: slice };
};

export const selectSimilarPlugin: PluginDefinition<CanvasStore> = {
  id: 'select-similar',
  metadata: {
    label: 'Select Similar',
    icon: Filter,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    selectionMode: 'elements',
  }),
  slices: [selectSimilarSliceFactory],
  sidebarPanels: [
    {
      key: 'select-similar',
      condition: (ctx) =>
        ctx.activePlugin === 'select' &&
        ctx.selectedElementsCount === 1 &&
        !ctx.isInSpecialPanelMode,
      component: SelectSimilarPanel,
    },
  ],
};
