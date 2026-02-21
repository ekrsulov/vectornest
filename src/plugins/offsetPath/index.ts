import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createOffsetPathSlice } from './slice';
import { OffsetPathPanel } from './OffsetPathPanel';
import { createPluginSlice } from '../../utils/pluginUtils';

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
