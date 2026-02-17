import type { SnapSource, SnapContext, SnapPoint } from '../../snap/types';
import type { Point, CanvasElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { ArrowsPluginSlice } from './slice';
import type { SnapPointsSlice } from '../../store/slices/features/snapPointsSlice';
import { collectSnapPoints } from '../../snap/snapSourceHelper';

type ArrowsStore = CanvasStore & ArrowsPluginSlice & SnapPointsSlice;

/**
 * ArrowsSnapSource provides snap points for the arrows tool.
 * It uses the shared snap point detection with plugin-specific configuration.
 */
export class ArrowsSnapSource implements SnapSource {
    id = 'arrows';

    constructor(private store: { getState: () => CanvasStore }) { }

    isEnabled(): boolean {
        const state = this.store.getState() as ArrowsStore;
        // Only enabled when arrows plugin is active and snapping is enabled
        return state.activePlugin === 'arrows' && (state.arrows?.enableSnapping ?? false);
    }

    getSnapPoints(context: SnapContext, point: Point): SnapPoint[] {
        const state = this.store.getState() as ArrowsStore;
        
        return collectSnapPoints(context, point, {
            sourceId: this.id,
            enableSnapping: state.arrows?.enableSnapping ?? false,
            elements: state.elements as CanvasElement[],
            snapPointsConfig: state.snapPoints
        });
    }
}

