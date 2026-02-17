import type { SnapSource, SnapContext, SnapPoint } from '../../snap/types';
import type { Point } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';

export class GridSnapSource implements SnapSource {
    id = 'grid';

    constructor(private store: { getState: () => CanvasStore }) { }

    isEnabled(): boolean {
        const state = this.store.getState();
        return state.grid?.enabled ?? false;
    }

    getSnapPoints(context: SnapContext, point: Point): SnapPoint[] {
        const state = this.store.getState();
        const grid = state.grid;

        if (!grid || !grid.enabled) return [];

        const spacing = grid.spacing;
        const snapThreshold = 10 / context.viewport.zoom;

        // Calculate closest grid point
        const snappedX = Math.round(point.x / spacing) * spacing;
        const snappedY = Math.round(point.y / spacing) * spacing;

        const dx = snappedX - point.x;
        const dy = snappedY - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= snapThreshold) {
            return [{
                id: `grid-${snappedX}-${snappedY}`,
                point: { x: snappedX, y: snappedY },
                type: 'grid',
                priority: 0, // Low priority
                sourceId: this.id,
            }];
        }

        return [];
    }
}
