import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createOffsetPathSlice } from './slice';
import { createPluginSlice } from '../../utils/pluginUtils';

const offsetPathSliceFactory = createPluginSlice(createOffsetPathSlice);
const OffsetPathPanel = React.lazy(() =>
  import('./OffsetPathPanel').then((module) => ({ default: module.OffsetPathPanel }))
);

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
