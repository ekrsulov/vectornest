import type { Point, PathElement } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';

/**
 * Represents an intersection point between two path segments.
 */
export interface TrimIntersection {
  /** Unique identifier for this intersection */
  id: string;

  /** Coordinates of the intersection point in canvas space */
  point: Point;

  /** ID of the first path involved in this intersection */
  pathId1: string;

  /** ID of the second path involved in this intersection */
  pathId2: string;

  /** Index of the segment in path1 where intersection occurs */
  segmentIndex1: number;

  /** Index of the segment in path2 where intersection occurs */
  segmentIndex2: number;

  /** Parametric position [0,1] along segment1 where intersection occurs */
  parameter1: number;

  /** Parametric position [0,1] along segment2 where intersection occurs */
  parameter2: number;
}

/**
 * Represents a trimmable segment (portion of a path between two intersections or endpoints).
 */
export interface TrimSegment {
  /** Unique identifier for this segment */
  id: string;

  /** ID of the original path this segment belongs to */
  pathId: string;

  /** Index of the sub-path within the original path (for CompoundPaths with multiple sub-paths) */
  subPathIndex: number;

  /** ID of the intersection at the start of this segment (null if path endpoint) */
  startIntersectionId: string | null;

  /** ID of the intersection at the end of this segment (null if path endpoint) */
  endIntersectionId: string | null;

  /** Starting point of the segment */
  startPoint: Point;

  /** Ending point of the segment */
  endPoint: Point;

  /** SVG path data representing this segment (includes curves) */
  pathData: string;

  /** Bounding box for efficient hit detection */
  boundingBox: Bounds;

  /** Indices of the original segments in the source path that comprise this trim segment */
  originalSegmentIndices: number[];

  /** Visual style properties inherited from the original path */
  style: {
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    strokeDasharray?: string;
  };
}

/**
 * Result of splitting paths by their intersections.
 */
export interface SplitPathResult {
  /** All intersections found between the paths */
  intersections: TrimIntersection[];

  /** All trimmable segments generated from the paths */
  segments: TrimSegment[];

  /** Map of original paths (pathId -> PathElement) for reference and undo */
  originalPaths: Map<string, PathElement>;
}

/**
 * A path reconstructed after trimming operations.
 */
export interface ReconstructedPath {
  /** ID for the new path (may reuse original or generate new) */
  id: string;

  /** Complete SVG path data */
  pathData: string;

  /** Complete style inherited from source path */
  style: {
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    fillRule?: 'nonzero' | 'evenodd';
    strokeDasharray?: string;
  };

  /** Whether this path is closed (forms a loop) */
  isClosed: boolean;

  /** ID of the original path this was derived from */
  sourcePathId: string;

  /** IDs of the segments that compose this path */
  containsSegmentIds: string[];

  /** The actual TrimSegments that compose this path (preserves structure) */
  reconstructedSegments: TrimSegment[];

  /** Transform inherited from source path */
  transform?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
}

/**
 * Validation result for paths before trimming.
 */
export interface TrimValidationResult {
  /** Whether the paths are valid for trimming */
  isValid: boolean;

  /** Error or warning message if not valid */
  message?: string;
}
