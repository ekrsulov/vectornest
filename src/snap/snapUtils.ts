import type { Point, Viewport } from '../types';
import { snapManager } from './SnapManager';
import type { SnapContext } from './types';
import type { SnapPoint as LegacySnapPoint } from '../utils/snap/types';

/**
 * Helper to get snap result using centralized snap manager.
 * Returns a SnapPoint in the legacy format used by plugin consumers.
 */
export function getPluginSnapResult(
    point: Point,
    viewport: Viewport,
    activePlugin: string,
    selectedIds: string[],
    enableSnapping: boolean
): LegacySnapPoint | null {
    if (!enableSnapping) return null;

    const snapContext: SnapContext = {
        viewport,
        canvasSize: { width: 0, height: 0 }, // Canvas size not strictly needed for basic snapping
        activePlugin,
        selectedIds,
    };

    const result = snapManager.snap(point, snapContext);

    if (result && result.snapPoints.length > 0) {
        const snapPoint = result.snapPoints[0];

        // Check if we have the original snap point in metadata (from plugin specific source)
        if (snapPoint.metadata?.original) {
            return snapPoint.metadata.original as LegacySnapPoint;
        }

        // Fallback: Convert centralized SnapPoint to legacy format
        return {
            point: { x: snapPoint.point.x, y: snapPoint.point.y },
            type: snapPoint.type as LegacySnapPoint['type'],
            elementId: snapPoint.metadata?.elementId,
            metadata: snapPoint.metadata,
        };
    }

    return null;
}
