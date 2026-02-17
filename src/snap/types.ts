import type { Point } from '../types';
import type { DragPointInfo } from '../types/extensionPoints';

// Unified snap type that includes all possible snap point types from all sources
export type SnapType =
    | 'grid'           // Grid snap points
    | 'vertex'         // Generic vertex (alias for anchor)
    | 'anchor'         // Path anchor points (M, L, C endpoints)
    | 'path'           // Closest point on path edges
    | 'center'         // Generic center (alias for bbox-center)
    | 'bbox-center'    // Center of bounding boxes
    | 'bbox-corner'    // Corners of bounding boxes
    | 'midpoint'       // Midpoints of lines, curves, or bbox edges
    | 'intersection'   // Intersection between line segments
    | 'guide'          // Guide lines
    | 'custom';        // Custom snap points

// Metadata interface for snap points - extensible for different snap sources
export interface SnapMetadata {
    [key: string]: unknown;
    elementId?: string;
    original?: unknown; // Preserves original snap point data from source
    commandIndex?: number;
    pointIndex?: number;
}

export interface SnapPoint {
    id?: string; // Optional ID for tracking/keys
    point: Point; // Nested point to match legacy structure
    type: SnapType;
    priority?: number; // Optional as legacy doesn't have it
    sourceId?: string; // Optional as legacy doesn't have it
    elementId?: string; // Top-level elementId to match legacy
    metadata?: SnapMetadata;
}

export interface SnapLine {
    id: string;
    type: 'vertical' | 'horizontal' | 'diagonal';
    start: Point;
    end: Point;
    sourceId: string;
    priority: number;
}

export interface SnapResult {
    snappedPoint: Point;
    originalPoint: Point;
    snapPoints: SnapPoint[]; // Points that contributed to this snap
    snapLines: SnapLine[]; // Lines that were snapped to
    allAvailableSnapPoints?: SnapPoint[]; // All available points for visualization
    distance: number;
}

import type { Viewport } from '../types';

export interface SnapContext {
    viewport: Viewport;
    canvasSize: {
        width: number;
        height: number;
    };
    activePlugin: string | null;
    selectedIds: string[];
    /** Información del punto activo durante drag (plugin-agnostic) */
    dragPointInfo?: DragPointInfo | null;
    // Add other relevant context here
}

export interface SnapSource {
    id: string;
    isEnabled: () => boolean;
    getSnapPoints: (context: SnapContext, point: Point) => SnapPoint[];
    // Optional: Some sources might only provide points near a location to optimize
}

export interface SnapStoreSlice {
    objectSnap: {
        enabled: boolean;
        currentSnapPoint: SnapPoint | null;
        cachedSnapPoints: SnapPoint[] | null;
        availableSnapPoints: SnapPoint[];
    };
}
