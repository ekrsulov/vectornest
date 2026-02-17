import type { DragModifier } from '../../types/interaction';
import type { PluginContextFull } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { GridPluginSlice } from './slice';

type GridSnapStore = CanvasStore & GridPluginSlice;

import { snapManager } from '../../snap/SnapManager';
import { useSnapStore } from '../../snap/store';
import { getDragPointInfo } from '../../utils/dragUtils';

export const createGridSnapModifier = (context: PluginContextFull<CanvasStore>): DragModifier => {
    return {
        id: 'gridSnap',
        priority: 50, // Run before object snap (100)
        modify: (point, _dragContext) => {
            const store = context.store.getState() as GridSnapStore;

            // Skip if we're in edit mode - useCanvasDrag handles snap for edit mode
            // This prevents double-snap and race conditions
            if (store.activePlugin === 'edit') {
                return point;
            }

            // We need the viewport for context.
            const viewport = store.viewport;
            const snapContext = {
                viewport,
                canvasSize: { width: 0, height: 0 }, // TODO: Get canvas size if needed
                activePlugin: store.activePlugin,
                selectedIds: store.selectedIds,
                dragPointInfo: getDragPointInfo(_dragContext),
            };

            const result = snapManager.snap(point, snapContext);

            if (result) {
                useSnapStore.getState().setSnapResult(result);
                return result.snappedPoint;
            } else {
                useSnapStore.getState().setSnapResult(null);
                return point;
            }
        }
    };
};
