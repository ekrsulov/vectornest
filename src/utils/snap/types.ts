import type { Point, CanvasElement, GroupElement } from '../../types';
import type { Bounds } from '../boundsUtils';

/**
 * Unified snap point type definition
 */
export type SnapPointType =
    | 'anchor'           // Path anchor points (M, L, C endpoints)
    | 'midpoint'         // Midpoints of lines, curves, or bbox edges
    | 'path'             // Closest point on path edges (lines and curves)
    | 'bbox-corner'      // Corners of bounding boxes
    | 'bbox-center'      // Center of bounding boxes
    | 'intersection'     // Intersection between line segments
    | 'grid'             // Grid snap points
    | 'vertex'           // Generic vertex
    | 'center'           // Generic center
    | 'guide'            // Guide lines
    | 'custom';          // Custom snap points

/**
 * Snap point information
 */
export interface SnapPoint {
    id?: string;
    point: Point;
    type: SnapPointType;
    elementId?: string;
    metadata?: {
        subpathIndex?: number;
        commandIndex?: number;
        pointIndex?: number;
    };
}

/**
 * Options for snap point detection
 */
export interface SnapPointOptions {
    snapToAnchors?: boolean;
    snapToMidpoints?: boolean;
    snapToPath?: boolean; // Closest point along the path (dynamic)
    snapToBBoxCorners?: boolean;
    snapToBBoxCenter?: boolean;
    snapToIntersections?: boolean;
    /** Element IDs to exclude from intersection calculations (e.g., element being edited) */
    excludeElementIds?: string[];
    /** Map of all elements for group lookups */
    elementMap?: Map<string, CanvasElement>;
    /** Function to get group bounds */
    getGroupBounds?: (group: GroupElement, elementMap: Map<string, CanvasElement>) => Bounds | null;
}

/**
 * Options for edge snap point detection
 */
export interface PathSnapOptions {
    /** Commands to exclude from edge snapping (e.g., segments connected to the point being dragged) */
    excludeCommands?: Array<{ subpathIndex: number; commandIndex: number }>;
}
