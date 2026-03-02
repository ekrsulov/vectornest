import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createVoronoiDiagramSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { Hexagon } from 'lucide-react';

registerStateKeys('voronoiDiagram', ['voronoiDiagram'], 'temporal');
const VoronoiDiagramPanel = lazy(() =>
  import('./VoronoiDiagramPanel').then((module) => ({ default: module.VoronoiDiagramPanel }))
);

export const voronoiDiagramPlugin: PluginDefinition<CanvasStore> = {
  id: 'voronoiDiagram',
  metadata: {
    label: 'Voronoi Diagram',
    cursor: 'default',
    icon: Hexagon,
  },
  slices: [createPluginSlice(createVoronoiDiagramSlice)],
  relatedPluginPanels: [
    {
      id: 'voronoi-diagram-panel',
      targetPlugin: 'generatorLibrary',
      component: VoronoiDiagramPanel,
      order: 70,
    },
  ],
};

export type { VoronoiDiagramPluginSlice } from './slice';
