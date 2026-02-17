import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createObjectSnapPluginSlice } from './slice';
import type { ObjectSnapPluginSlice } from './slice';
import { ObjectSnapPanel } from './ObjectSnapPanel';
import { pluginManager } from '../../utils/pluginManager';
import { ObjectSnapSource } from './ObjectSnapSource';
import { snapManager } from '../../snap/SnapManager';
import { registerSnapProvider, unregisterSnapProvider } from '../../snap/snapProviderRegistry';

const objectSnapSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createObjectSnapPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const objectSnapPlugin: PluginDefinition<CanvasStore> = {
  id: 'objectSnap',
  metadata: {
    label: 'Object Snap',
    cursor: 'default',
  },
  // All snap visualization is handled by centralized SnapOverlay (src/snap/SnapOverlay.tsx)
  canvasLayers: [],
  slices: [objectSnapSliceFactory],
  init: (context) => {
    // Register snap source with centralized snap manager
    const objectSnapSource = new ObjectSnapSource(context.store);
    snapManager.registerSource(objectSnapSource);
    registerSnapProvider({
      pluginId: 'objectSnap',
      priority: 100,
      isActive: (state) => Boolean((state as unknown as ObjectSnapPluginSlice)?.objectSnap?.enabled),
      getOverlayConfig: (state) => {
        const s = state as CanvasStore & ObjectSnapPluginSlice;
        // Defer to edit plugin config when edit está activo para respetar flags específicos
        if (state.activePlugin === 'edit') {
          return null;
        }
        const snapPoints = (state as CanvasStore).snapPoints ?? {};
        const editingPoint = (state as { editingPoint?: { elementId?: string; commandIndex?: number; isDragging?: boolean } }).editingPoint;
        const draggingSelection = (state as { draggingSelection?: { isDragging?: boolean } }).draggingSelection;
        const draggingSubpaths = (state as { draggingSubpaths?: { isDragging?: boolean } }).draggingSubpaths;

        const isDragging = Boolean(
          editingPoint?.isDragging || draggingSelection?.isDragging || draggingSubpaths?.isDragging
        );
        return {
          showStaticPoints: Boolean(snapPoints.showSnapPoints),
          snapPointsOpacity: snapPoints.snapPointsOpacity ?? 100,
          cachedSnapPoints: s.objectSnap?.availableSnapPoints ?? [],
          currentSnapInfo: s.objectSnap?.currentSnapPoint ?? null,
          availableSnapPoints: s.objectSnap?.availableSnapPoints ?? [],
          isInteracting: isDragging,
          mode: 'objectSnap',
        };
      },
    });

    // Invalidate snap point cache when entering edit mode
    // This covers all cases: elements moved, deleted, edited by any plugin, etc.
    const unregisterModeEnter = pluginManager.registerLifecycleAction(
      'onModeEnter:edit',
      () => {
        const state = context.store.getState() as CanvasStore & ObjectSnapPluginSlice;
        state.invalidateObjectSnapCache?.();
      }
    );

    // Return cleanup function
    return () => {
      snapManager.unregisterSource(objectSnapSource.id);
      unregisterModeEnter();
      unregisterSnapProvider('objectSnap');
    };
  },
  relatedPluginPanels: [
    {
      id: 'objectSnap-edit-panel',
      targetPlugin: 'edit',
      component: ObjectSnapPanel,
      order: 99, // Place at the end
    },
  ],
};

export type { ObjectSnapPluginSlice };
