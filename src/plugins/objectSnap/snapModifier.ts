import type { DragModifier } from '../../types/interaction';
import type { PluginContextFull } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { snapManager } from '../../snap/SnapManager';
import { getDragPointInfo } from '../../utils/dragUtils';

export const createSnapModifier = (context: PluginContextFull<CanvasStore>): DragModifier => {
    return {
        id: 'objectSnap',
        priority: 100, // High priority to run last (after other modifications)
        modify: (point, dragContext) => {
            const store = context.store.getState();

            // Use centralized SnapManager instead of applyObjectSnap
            const snapContext = {
                viewport: store.viewport,
                canvasSize: { width: 0, height: 0 },
                activePlugin: store.activePlugin,
                selectedIds: dragContext.excludeElementIds || [],
                dragPointInfo: getDragPointInfo(dragContext) ?? undefined,
            };

            const result = snapManager.snap(point, snapContext);
            if (result && result.snapPoints.length > 0) {
                return result.snappedPoint;
            }

            return point;
        }
    };
};
