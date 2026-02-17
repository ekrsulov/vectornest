import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { MarkersSlice, MarkerDefinition } from './slice';

registerImportContribution<MarkerDefinition>({
  pluginId: 'marker',
  merge: (imports) => {
    const defs = imports as MarkerDefinition[] | undefined;
    if (!defs || defs.length === 0) return;
    const markerState = canvasStoreApi.getState() as unknown as MarkersSlice;
    if (markerState.markers === undefined) return;
    const existingIds = new Set(markerState.markers.map((m) => m.id));
    const newMarkers = defs.filter((m) => !existingIds.has(m.id));
    if (newMarkers.length === 0) return;
    canvasStoreApi.setState({
      markers: [...markerState.markers, ...newMarkers],
    } as Partial<MarkersSlice>);
  },
});
