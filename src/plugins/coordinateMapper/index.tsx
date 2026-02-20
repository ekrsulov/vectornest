import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createCoordinateMapperSlice } from './slice';
import { CoordinateMapperPanel } from './CoordinateMapperPanel';
import { CoordinateMapperOverlay } from './CoordinateMapperOverlay';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { createSettingsPanel } from '../../utils/pluginFactories';

registerStateKeys('coordinateMapper', ['coordinateMapper'], 'both');

export const coordinateMapperPlugin: PluginDefinition<CanvasStore> = {
  id: 'coordinateMapper',
  metadata: {
    label: 'Coordinate Mapper',
    cursor: 'default',
  },
  slices: [createPluginSlice(createCoordinateMapperSlice)],
  sidebarPanels: [createSettingsPanel('coordinateMapper', CoordinateMapperPanel)],
  canvasLayers: [
    {
      id: 'coordinateMapper',
      placement: 'foreground',
      render: () => <CoordinateMapperOverlay />,
    },
  ],
  toolDefinition: {
    order: 620,
  },
};

export type { CoordinateMapperPluginSlice } from './slice';
