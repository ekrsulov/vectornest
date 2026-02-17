import type { Point } from '../../types';

/**
 * Pen tool operational modes
 */
export type PenMode = 'idle' | 'drawing' | 'editing' | 'continuing';

/**
 * Anchor point types defining handle behavior
 * - corner: Sharp change, no handles or broken handles
 * - smooth: Handles are collinear for continuous tangency
 * - cusp: Handles are independent, not collinear
 */
export type AnchorPointType = 'corner' | 'smooth' | 'cusp';

/**
 * Anchor point in a pen path with optional direction handles
 */
export interface PenAnchorPoint {
    id: string;
    position: Point;
    type: AnchorPointType;
    /**
     * Incoming handle (direction line entering the anchor)
     * Position is relative to the anchor position
     */
    inHandle?: Point;
    /**
     * Outgoing handle (direction line leaving the anchor)
     * Position is relative to the anchor position
     */
    outHandle?: Point;
}

/**
 * Segment connecting two consecutive anchors
 */
export interface PenSegment {
    /**
     * Index of the starting anchor in the path's anchor array
     */
    startAnchorIndex: number;
    /**
     * Index of the ending anchor in the path's anchor array
     */
    endAnchorIndex: number;
    /**
     * Segment type based on handle presence
     */
    type: 'straight' | 'curved';
}

/**
 * Path being created/edited with the pen tool
 */
export interface PenPath {
    /**
     * Ordered list of anchors
     */
    anchors: PenAnchorPoint[];
    /**
     * Whether the path forms a closed loop
     */
    closed: boolean;
    /**
     * Temporary ID for the path while being created
     */
    tempId: string;
}

/**
 * Cursor state for visual feedback
 */
export type PenCursorState =
    | 'new-path'        // Pen with asterisk - starting new path
    | 'continue'        // Plain pen - continuing path
    | 'close'           // Pen with circle - closing path
    | 'add-anchor'      // Pen with plus - adding anchor to segment
    | 'delete-anchor'   // Pen with minus - deleting anchor
    | 'convert'         // Convert anchor tool cursor
    | 'reshape'         // Reshape segment cursor
    | 'default';        // Standard pen cursor

/**
 * Hover target information for cursor state calculation
 */
export interface PenHoverTarget {
    type: 'none' | 'canvas' | 'first-anchor' | 'anchor' | 'segment' | 'handle' | 'endpoint';
    pathId?: string; // ID of the path element on canvas (if editing existing path)
    subPathIndex?: number; // Index of the subpath within the path element
    anchorIndex?: number;
    segmentIndex?: number;
    handleType?: 'in' | 'out';
}

/**
 * What is being dragged during pointer interaction
 */
export interface PenDragState {
    type: 'anchor' | 'handle' | 'new-anchor' | 'segment';
    anchorIndex?: number;
    segmentIndex?: number;
    handleType?: 'in' | 'out';
    t?: number; // Parameter along segment (0 to 1) for segment curving
    startPoint: Point;
    currentPoint: Point;
    /**
     * Explicit handles for visual feedback during drag (e.g., Cusp Creation)
     */
    inHandle?: Point;
    outHandle?: Point;
}

/**
 * State of the pen tool
 */
export interface PenState {
    mode: PenMode;
    currentPath: PenPath | null;
    activeAnchorIndex: number | null; // Index of the anchor being manipulated (if any)
    previewAnchor: PenAnchorPoint | null; // For rubber band preview
    dragState: PenDragState | null;
    cursorState: PenCursorState;
    autoAddDelete: boolean; // Whether to automatically add/delete anchors on click
    rubberBandEnabled: boolean;
    editingPathId: string | null; // ID of the path element currently being edited
    editingSubPathIndex: number | null; // Index of the subpath within the path element being edited
    selectedAnchorIndex: number | null; // Index of the selected anchor in the editing path
    hoverTarget: PenHoverTarget | null; // Current hover target for visual feedback
}
