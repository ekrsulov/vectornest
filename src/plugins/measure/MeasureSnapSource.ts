import type { SnapSource, SnapContext, SnapPoint } from '../../snap/types';
import type { Point, CanvasElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { MeasurePluginSlice } from './slice';
import type { SnapPointsSlice } from '../../store/slices/features/snapPointsSlice';
import { collectSnapPoints } from '../../snap/snapSourceHelper';

type MeasureSnapStore = CanvasStore & MeasurePluginSlice & SnapPointsSlice;

/**
 * MeasureSnapSource provides snap points for the measure tool.
 * It uses the shared snap point detection with plugin-specific configuration.
 */
export class MeasureSnapSource implements SnapSource {
    id = 'measure';

    constructor(private store: { getState: () => CanvasStore }) { }

    isEnabled(): boolean {
        const state = this.store.getState() as MeasureSnapStore;
        // Only enabled when measure plugin is active and snapping is enabled
        return state.activePlugin === 'measure' && (state.measure?.enableSnapping ?? false);
    }

    getSnapPoints(context: SnapContext, point: Point): SnapPoint[] {
        const state = this.store.getState() as MeasureSnapStore;
        
        return collectSnapPoints(context, point, {
            sourceId: this.id,
            enableSnapping: state.measure?.enableSnapping ?? false,
            elements: state.elements as CanvasElement[],
            snapPointsConfig: state.snapPoints
        });
    }
}

