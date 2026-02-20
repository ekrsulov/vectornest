import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createOffsetPathSlice } from './slice';
import type { OffsetPathSlice } from './slice';
import { OffsetPathPanel } from './OffsetPathPanel';
import { CircleDot } from 'lucide-react';
import { pluginManager } from '../../utils/pluginManager';
import { createPluginSlice } from '../../utils/pluginUtils';

type OffsetPathStore = CanvasStore & OffsetPathSlice;

const offsetPathSliceFactory = createPluginSlice(createOffsetPathSlice);

export const offsetPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'offsetPath',
  metadata: {
    label: 'Offset Path',
    cursor: 'default',
  },
  init: (_context) => {
    return () => { };
  },
  contextMenuActions: [
    {
      id: 'offset-path',
      action: (context) => {
        // Offset path is available in multiselection, group, path, subpath
        const validTypes = ['multiselection', 'group', 'path', 'subpath'];
        if (!validTypes.includes(context.type)) return null;

        const store = pluginManager.requireStoreApi();
        const state = store.getState() as OffsetPathStore;

        if (!state.canApplyOffset?.()) return null;

        return {
          id: 'offset-path',
          label: 'Offset Path',
          icon: CircleDot,
          onClick: () => {
            state.applyOffsetPath?.();
          }
        };
      }
    }
  ],
  slices: [offsetPathSliceFactory],
  relatedPluginPanels: [
    {
      id: 'offset-path',
      targetPlugin: 'generatorLibrary',
      component: OffsetPathPanel,
      order: 200,
    },
  ],
};
