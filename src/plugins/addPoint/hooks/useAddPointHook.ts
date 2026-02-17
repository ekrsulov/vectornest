import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasServiceActivation } from '../../../canvas/hooks/useCanvasServiceActivation';
import { useCanvasStore, canvasStoreApi } from '../../../store/canvasStore';
import { ADD_POINT_SERVICE_ID, type AddPointServiceState } from '../listeners/AddPointListener';
import type { AddPointPluginSlice } from '../slice';

export function useAddPointHook(context: PluginHooksContext): void {
  const { svgRef, activePlugin, screenToCanvas, emitPointerEvent } = context;
  
  const isAddPointModeActive = useCanvasStore(state => 
    (state as unknown as AddPointPluginSlice).addPointMode?.isActive ?? false
  );
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const zoom = useCanvasStore(state => state.viewport.zoom);

  useCanvasServiceActivation<AddPointServiceState>({
    serviceId: ADD_POINT_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin,
      isAddPointModeActive,
      elements,
      selectedIds,
      zoom,
      screenToCanvas,
      emitPointerEvent,
      updateAddPointHover: (position, elementId, segmentInfo) => {
        canvasStoreApi.getState().updateAddPointHover?.(position, elementId, segmentInfo);
      },
      insertPointOnPath: () => {
        return canvasStoreApi.getState().insertPointOnPath?.() ?? null;
      },
      hasValidHover: () => {
        const addPointMode = canvasStoreApi.getState().addPointMode;
        return addPointMode?.hoverPosition !== null && addPointMode?.hoverPosition !== undefined;
      },
    }),
    // Only include dependencies that should trigger state update
    // Keep this list explicit to avoid unnecessary service updates.
    stateDeps: [
      activePlugin,
      isAddPointModeActive,
      zoom,
      elements,
      selectedIds,
    ],
  });
}
