import type { Point } from '../types';
import type { SnapContext, SnapPoint, SnapResult, SnapSource } from './types';
import { logger } from '../utils/logger';

class SnapManager {
    private sources: Map<string, SnapSource> = new Map();
    private enabled: boolean = true;
    private snapThreshold: number = 10; // pixels in screen space

    registerSource(source: SnapSource) {
        this.sources.set(source.id, source);
    }

    unregisterSource(sourceId: string) {
        this.sources.delete(sourceId);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    snap(point: Point, context: SnapContext): SnapResult | null {
        if (!this.enabled) return null;

        const allCandidates: SnapPoint[] = [];

        // Collect snap points from all enabled sources
        for (const source of this.sources.values()) {
            if (source.isEnabled()) {
                try {
                    const points = source.getSnapPoints(context, point);
                    allCandidates.push(...points);
                } catch (error) {
                    logger.error(`Error getting snap points from source ${source.id}:`, error);
                }
            }
        }

        if (allCandidates.length === 0) return null;

        // Convert threshold from screen pixels to canvas units
        const thresholdInCanvas = this.snapThreshold / context.viewport.zoom;
        // Use squared distance to avoid expensive Math.sqrt on every candidate
        const thresholdSq = thresholdInCanvas * thresholdInCanvas;

        // Find the closest snap point within threshold
        let closestPoint: SnapPoint | null = null;
        let minDistanceSq = thresholdSq;

        for (const candidate of allCandidates) {
            const dx = candidate.point.x - point.x;
            const dy = candidate.point.y - point.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestPoint = candidate;
            } else if (Math.abs(distanceSq - minDistanceSq) < 1e-10 && closestPoint) {
                // If effectively same distance (epsilon comparison), prefer higher priority
                const candidatePriority = candidate.priority ?? 0;
                const closestPriority = closestPoint.priority ?? 0;
                if (candidatePriority > closestPriority) {
                    closestPoint = candidate;
                }
            }
        }

        if (!closestPoint) return null;

        return {
            snappedPoint: { x: closestPoint.point.x, y: closestPoint.point.y },
            originalPoint: point,
            snapPoints: [closestPoint],
            snapLines: [],
            allAvailableSnapPoints: allCandidates, // Include all for visualization
            distance: Math.sqrt(minDistanceSq),
        };
    }
}

export const snapManager = new SnapManager();
