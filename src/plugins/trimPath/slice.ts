import type { StateCreator } from 'zustand';
import type { Point, SubPath, Command, PathElement } from '../../types';
import type { SplitPathResult, ReconstructedPath, TrimIntersection } from './trimPath';
import type { CanvasStore } from '../../store/canvasStore';
import paper from 'paper';
import { logger } from '../../utils/logger';
import {
  findSegmentsAlongPath,
  reconstructPathsFromSegments,
  computePathIntersections,
} from './trimPathGeometry';
import { trimPathCache } from './cache';
import { selectionHasOnlyPaths, getPathsFromSelection } from '../../utils/selectionGuards';

type FullStore = CanvasStore & TrimPathPluginSlice;
type TrimPathMetrics = ReturnType<typeof analyzeTrimState>;
const FALLBACK_SUBPATHS: SubPath[] = [[{ type: 'M', position: { x: 0, y: 0 } }]];

/**
 * Converts a SubPath to SVG path data string for debugging.
 */
function convertSubPathToSVGPathData(subPath: SubPath): string {
  return subPath.map(cmd => {
    switch (cmd.type) {
      case 'M':
        return `M ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'L':
        return `L ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'C':
        return `C ${cmd.controlPoint1.x.toFixed(2)} ${cmd.controlPoint1.y.toFixed(2)} ${cmd.controlPoint2.x.toFixed(2)} ${cmd.controlPoint2.y.toFixed(2)} ${cmd.position.x.toFixed(2)} ${cmd.position.y.toFixed(2)}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');
}

/**
 * State slice for the Trim Path plugin.
 */
export interface TrimPathPluginSlice {
  trimPath: {
    /** Whether the trim tool is currently active */
    isActive: boolean;

    /** Result of splitting paths by intersections (when tool is active) */
    splitResult: SplitPathResult | null;

    /** ID of the segment currently under the cursor */
    hoveredSegmentId: string | null;

    /** IDs of segments marked for removal (during drag) */
    markedSegmentIds: string[];

    /** Whether the user is currently dragging to mark multiple segments */
    isDragging: boolean;

    /** Path traced by cursor during drag operation */
    cursorPath: Point[];
  };

  /** Activates the trim tool with currently selected paths */
  activateTrimTool: () => void;

  /** Deactivates the trim tool and clears state */
  deactivateTrimTool: () => void;

  /** Refreshes the cache when selection or paths change */
  refreshTrimCache: () => void;

  /** Updates which segment is hovered */
  setHoveredSegment: (segmentId: string | null) => void;

  /** Starts a drag operation to mark multiple segments */
  startTrimDrag: (startPoint: Point) => void;

  /** Updates the drag path and marks intersected segments */
  updateTrimDrag: (currentPoint: Point) => void;

  /** Completes the drag operation and applies trim to marked segments */
  finishTrimDrag: () => void;

  /** Cancels the drag operation without applying changes */
  cancelTrimDrag: () => void;

  /** Trims a single segment (click operation) */
  trimSegment: (segmentId: string) => void;

  /** Debug method: Logs detailed information about paths and segments */
  debugTrimState: () => void;
}

function analyzeTrimState(state: FullStore) {
  const trimPath = state.trimPath;
  const selectedIds = state.selectedIds || [];
  const elements = state.elements || [];
  const selectedPaths = elements.filter(
    (el) => selectedIds.includes(el.id) && el.type === 'path'
  ) as PathElement[];

  const intersectionsByPathAndCurve = new Map<string, Map<number, TrimIntersection[]>>();
  const splitResult = trimPath.splitResult;

  if (splitResult) {
    splitResult.intersections.forEach((intersection) => {
      const pathSegments = [
        { pathId: intersection.pathId1, segmentIndex: intersection.segmentIndex1 },
        { pathId: intersection.pathId2, segmentIndex: intersection.segmentIndex2 },
      ];

      pathSegments.forEach(({ pathId, segmentIndex }) => {
        const curves = intersectionsByPathAndCurve.get(pathId) ?? new Map<number, TrimIntersection[]>();
        const entries = curves.get(segmentIndex) ?? [];
        entries.push(intersection);
        curves.set(segmentIndex, entries);
        intersectionsByPathAndCurve.set(pathId, curves);
      });
    });
  }

  return {
    toolState: {
      isActive: trimPath.isActive,
      isDragging: trimPath.isDragging,
      hoveredSegmentId: trimPath.hoveredSegmentId,
      markedSegmentIds: trimPath.markedSegmentIds,
    },
    selectedPathCount: selectedIds.length,
    selectedPaths: selectedPaths.map((path) => ({
      id: path.id,
      subPathCount: path.data.subPaths.length,
      subPaths: path.data.subPaths.map(convertSubPathToSVGPathData),
      style: {
        strokeWidth: path.data.strokeWidth,
        strokeColor: path.data.strokeColor,
        fillColor: path.data.fillColor,
      },
    })),
    splitResult: splitResult
      ? {
          intersectionCount: splitResult.intersections.length,
          intersections: splitResult.intersections.map((intersection) => ({
            id: intersection.id,
            point: {
              x: intersection.point.x,
              y: intersection.point.y,
            },
            path1: intersection.pathId1,
            path2: intersection.pathId2,
            segment1: intersection.segmentIndex1,
            segment2: intersection.segmentIndex2,
            param1: Number(intersection.parameter1.toFixed(3)),
            param2: Number(intersection.parameter2.toFixed(3)),
          })),
          intersectionsByPathAndCurve: Array.from(intersectionsByPathAndCurve.entries()).map(([pathId, curveMap]) => {
            const pathElement = selectedPaths.find((path) => path.id === pathId);
            return {
              pathId,
              pathLabel: pathElement ? `${pathId.substring(0, 20)}...` : pathId,
              curves: Array.from(curveMap.entries()).map(([curveIndex, intersections]) => ({
                curveIndex,
                count: intersections.length,
                points: intersections.map((intersection) => ({
                  x: Number(intersection.point.x.toFixed(1)),
                  y: Number(intersection.point.y.toFixed(1)),
                })),
              })),
            };
          }),
          segmentCount: splitResult.segments.length,
          segmentsByPath: Array.from(
            splitResult.segments.reduce<Map<string, typeof splitResult.segments>>((acc, segment) => {
              const segments = acc.get(segment.pathId) ?? [];
              segments.push(segment);
              acc.set(segment.pathId, segments);
              return acc;
            }, new Map())
          ).map(([pathId, segments]) => ({
            pathId,
            count: segments.length,
            segments: segments.map((segment, index) => {
              const isHovered = segment.id === trimPath.hoveredSegmentId;
              const isMarked = trimPath.markedSegmentIds.includes(segment.id);
              return {
                id: segment.id,
                index,
                status: isMarked ? 'marked' : isHovered ? 'hovered' : 'idle',
                start: {
                  x: Number(segment.startPoint.x.toFixed(2)),
                  y: Number(segment.startPoint.y.toFixed(2)),
                },
                end: {
                  x: Number(segment.endPoint.x.toFixed(2)),
                  y: Number(segment.endPoint.y.toFixed(2)),
                },
                startIntersectionId: segment.startIntersectionId ?? 'none',
                endIntersectionId: segment.endIntersectionId ?? 'none',
                pathData: segment.pathData,
                boundingBox: {
                  minX: Number(segment.boundingBox.minX.toFixed(2)),
                  maxX: Number(segment.boundingBox.maxX.toFixed(2)),
                  minY: Number(segment.boundingBox.minY.toFixed(2)),
                  maxY: Number(segment.boundingBox.maxY.toFixed(2)),
                },
              };
            }),
          })),
        }
      : null,
    cache: {
      cachedPathIds: trimPathCache.getCachedPathIds(),
      isValidForSelection: trimPathCache.isValidFor(selectedIds),
    },
  };
}

/**
 * Factory for creating the Trim Path plugin slice.
 */
export const createTrimPathPluginSlice: StateCreator<
  TrimPathPluginSlice,
  [],
  [],
  TrimPathPluginSlice
> = (set, get) => ({
  // Initial state
  trimPath: {
    isActive: false,
    splitResult: null,
    hoveredSegmentId: null,
    markedSegmentIds: [],
    isDragging: false,
    cursorPath: [],
  },

  // Actions
  activateTrimTool: () => {
    const state = get() as FullStore;
    const selectedIds = state.selectedIds || [];
    const elements = state.elements || [];

    if (!selectionHasOnlyPaths(selectedIds, elements)) {
      trimPathCache.clear();
      set({
        trimPath: {
          isActive: false,
          splitResult: null,
          hoveredSegmentId: null,
          markedSegmentIds: [],
          isDragging: false,
          cursorPath: [],
        },
      } as Partial<FullStore>);
      return;
    }

    // Use the helper function to calculate trim state
    recalculateTrimState(selectedIds, get as () => FullStore, set as (partial: Partial<FullStore>) => void);
  },

  deactivateTrimTool: () => {

    // Clear the cache when deactivating
    trimPathCache.clear();

    set({
      trimPath: {
        isActive: false,
        splitResult: null,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
  },

  refreshTrimCache: () => {
    const state = get() as FullStore;

    // Only refresh if trim tool is active
    if (!state.trimPath?.isActive) {
      return;
    }

    const selectedIds = state.selectedIds || [];
    const elements = state.elements || [];

    // Get the path elements by IDs
    const currentPaths = elements.filter(
      (el) => selectedIds.includes(el.id) && el.type === 'path'
    ) as PathElement[];

    // Refresh the cache
    const splitResult = trimPathCache.refresh(currentPaths);

    if (!splitResult) {
      // If validation fails, deactivate
      state.deactivateTrimTool?.();
      return;
    }

    // Update state with refreshed cache
    set({
      trimPath: {
        ...state.trimPath,
        splitResult,
        hoveredSegmentId: null,
        markedSegmentIds: [],
      },
    });
  },

  setHoveredSegment: (segmentId: string | null) => {

    set({
      trimPath: {
        ...get().trimPath,
        hoveredSegmentId: segmentId,
      },
    });
  },

  startTrimDrag: (startPoint: Point) => {

    set({
      trimPath: {
        ...get().trimPath,
        isDragging: true,
        cursorPath: [startPoint],
        markedSegmentIds: [],
      },
    });
  },

  updateTrimDrag: (currentPoint: Point) => {
    const currentTrimPath = get().trimPath;

    if (!currentTrimPath.isDragging) {
      return;
    }

    // Get splitResult from cache or state
    const splitResult = currentTrimPath.splitResult || trimPathCache.get();

    if (!splitResult) {
      return;
    }

    const newCursorPath = [...currentTrimPath.cursorPath, currentPoint];
    const markedSegmentIds = findSegmentsAlongPath(
      splitResult.segments,
      newCursorPath,
      5 // threshold in pixels
    );

    set({
      trimPath: {
        ...currentTrimPath,
        cursorPath: newCursorPath,
        markedSegmentIds,
      },
    });
  },

  finishTrimDrag: () => {
    const currentTrimPath = get().trimPath;

    if (!currentTrimPath.isDragging || currentTrimPath.markedSegmentIds.length === 0) {
      // Cancel if no segments marked
      get().cancelTrimDrag();
      return;
    }

    // Apply the trim
    applyTrim(currentTrimPath.markedSegmentIds, get as () => FullStore, set as (partial: Partial<FullStore>) => void);

    // Reset drag state but keep tool active
    set({
      trimPath: {
        ...get().trimPath,
        isDragging: false,
        cursorPath: [],
        markedSegmentIds: [],
      },
    });

    // Recompute intersections with new paths
    get().activateTrimTool();
  },

  cancelTrimDrag: () => {

    set({
      trimPath: {
        ...get().trimPath,
        isDragging: false,
        cursorPath: [],
        markedSegmentIds: [],
      },
    });
  },

  trimSegment: (segmentId: string) => {

    // Apply trim to single segment
    applyTrim([segmentId], get as () => FullStore, set as (partial: Partial<FullStore>) => void);

    // Recompute intersections with new paths
    get().activateTrimTool();
  },

  debugTrimState: () => {
    const state = get() as FullStore;
    const metrics: TrimPathMetrics = analyzeTrimState(state);
    logger.debug('[TrimPath] Debug state', metrics);
  },
});

/**
 * Helper function to apply trim operation to the store.
 * This removes segments and reconstructs paths.
 */
function applyTrim(
  segmentIdsToRemove: string[],
  get: () => FullStore,
  set: (partial: Partial<FullStore>) => void
) {
  const currentTrimPath = get().trimPath;

  if (!currentTrimPath.splitResult) {
    logger.warn('[TrimPath] Cannot apply trim without split result');
    return;
  }

  // Reconstruct paths from remaining segments
  const reconstructedPaths: ReconstructedPath[] = reconstructPathsFromSegments(
    currentTrimPath.splitResult.segments,
    segmentIdsToRemove,
    currentTrimPath.splitResult.originalPaths
  );

  // Get current store state
  const state = get();
  const elements = state.elements || [];
  const originalPathIds = Array.from(currentTrimPath.splitResult.originalPaths.keys());

  // Remove original paths
  const elementsWithoutOriginals = elements.filter(
    (el) => !originalPathIds.includes(el.id)
  );

  // Add reconstructed paths  
  const newElements = [
    ...elementsWithoutOriginals,
    ...reconstructedPaths.map((rp, index) => ({
      id: rp.id,
      type: 'path' as const,
      zIndex: elementsWithoutOriginals.filter((el) => !el.parentId).length + index,
      parentId: null,
      data: {
        subPaths: parsePathDataToSubPaths(rp.pathData),
        strokeWidth: rp.style.strokeWidth,
        strokeColor: rp.style.strokeColor,
        strokeOpacity: rp.style.strokeOpacity,
        fillColor: rp.style.fillColor,
        fillOpacity: rp.style.fillOpacity,
        strokeLinecap: rp.style.strokeLinecap,
        strokeLinejoin: rp.style.strokeLinejoin,
        fillRule: rp.style.fillRule,
        strokeDasharray: rp.style.strokeDasharray,
        transform: rp.transform,
      },
    })),
  ];

  // Update store
  set({ elements: newElements });

  // Update selection to new paths
  const newPathIds = reconstructedPaths.map(rp => rp.id);
  if (state.selectElements) {
    state.selectElements(newPathIds);
  }

  // Get the new path elements
  const newPathElements = newElements.filter(
    (el) => newPathIds.includes(el.id) && el.type === 'path'
  ) as PathElement[];

  // Collect all reconstructed segments (preserving structure!)
  const allReconstructedSegments = reconstructedPaths.flatMap(rp => rp.reconstructedSegments);

  // Recompute intersections (we need to do this with the new paths)
  const newIntersections = computePathIntersections(newPathElements);

  // Use refreshWithSegments instead of refresh to preserve segment structure
  const splitResult = trimPathCache.refreshWithSegments(
    newPathElements,
    allReconstructedSegments,
    newIntersections
  );

  if (splitResult) {
    // Update trim state with new split result
    set({
      trimPath: {
        ...get().trimPath,
        isActive: true,
        splitResult,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
  }
}

/**
 * Recalculates trim state after paths have changed (e.g., after trimming)
 */
function recalculateTrimState(
  pathIds: string[],
  get: () => FullStore,
  set: (partial: Partial<FullStore>) => void
) {
  const state = get();
  const elements = state.elements || [];

  if (!selectionHasOnlyPaths(pathIds, elements)) {
    trimPathCache.clear();
    set({
      trimPath: {
        ...get().trimPath,
        isActive: false,
        splitResult: null,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
    return;
  }

  // Get the path elements by IDs
  const currentPaths = getPathsFromSelection(pathIds, elements);

  // Refresh the cache with the current paths
  const splitResult = trimPathCache.refresh(currentPaths);

  if (!splitResult) {
    // If validation fails or not enough paths, deactivate trim mode
    set({
      trimPath: {
        ...get().trimPath,
        isActive: false,
        splitResult: null,
        hoveredSegmentId: null,
        markedSegmentIds: [],
        isDragging: false,
        cursorPath: [],
      },
    });
    return;
  }

  // Update trim state with new intersections from cache
  set({
    trimPath: {
      ...get().trimPath,
      isActive: true,
      splitResult,
      hoveredSegmentId: null,
      markedSegmentIds: [],
      isDragging: false,
      cursorPath: [],
    },
  });
}

/**
 * Parses SVG path data string into SubPath array by splitting on M commands.
 * This avoids the data loss that occurs with Paper.js importSVG round-trips.
 */
function parsePathDataToSubPaths(pathData: string): SubPath[] {
  try {
    // Split path data by M commands (case insensitive)
    // This regex captures M/m and the rest of the path data until the next M/m
    const pathDataTrimmed = pathData.trim();
    if (!pathDataTrimmed) {
      return FALLBACK_SUBPATHS;
    }
    const subPathStrings: string[] = [];

    // Find all M or m commands and split there
    const mCommandRegex = /[Mm]/g;
    let match;
    const mPositions: number[] = [0]; // Start position

    while ((match = mCommandRegex.exec(pathDataTrimmed)) !== null) {
      if (match.index > 0) { // Skip the first M at position 0
        mPositions.push(match.index);
      }
    }

    // Extract subpath strings
    for (let i = 0; i < mPositions.length; i++) {
      const start = mPositions[i];
      const end = i < mPositions.length - 1 ? mPositions[i + 1] : pathDataTrimmed.length;
      const subPathStr = pathDataTrimmed.substring(start, end).trim();
      if (subPathStr) {
        subPathStrings.push(subPathStr);
      }
    }

    // If no M commands found, treat entire string as one subpath
    if (subPathStrings.length === 0 && pathDataTrimmed) {
      subPathStrings.push(pathDataTrimmed);
    }

    // Parse each subpath string using Paper.js
    const subPaths: SubPath[] = [];

    for (let i = 0; i < subPathStrings.length; i++) {
      const subPathStr = subPathStrings[i];
      try {
        // Use Paper.js to parse this single subpath
        const paperPath = new paper.Path(subPathStr);
        const commands = pathToCommands(paperPath);
        paperPath.remove();

        if (commands.length > 0) {
          subPaths.push(commands);
        }
      } catch (error) {
        logger.warn(`[TrimPath] Failed to parse subpath ${i}`, error);
      }
    }
    return subPaths.length > 0 ? subPaths : FALLBACK_SUBPATHS;
  } catch (error) {
    logger.error('[TrimPath] Error parsing path data to subpaths', error);
    return FALLBACK_SUBPATHS;
  }
}

// Helper function to round with precision
function roundToPrecision(value: number, precision = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

// Helper to convert a single Paper.js Path to Command array
function pathToCommands(paperPath: paper.Path): Command[] {
  const commands: Command[] = [];

  // Convert Paper.js segments to our Command format
  for (let i = 0; i < paperPath.segments.length; i++) {
    const segment = paperPath.segments[i];
    const point = segment.point;

    if (i === 0) {
      // First segment is always a MoveTo
      commands.push({
        type: 'M',
        position: { x: roundToPrecision(point.x), y: roundToPrecision(point.y) },
      });
    } else {
      const prevSegment = paperPath.segments[i - 1];

      // Check if this is a curve or a line
      if (prevSegment.handleOut.isZero() && segment.handleIn.isZero()) {
        // Straight line
        commands.push({
          type: 'L',
          position: { x: roundToPrecision(point.x), y: roundToPrecision(point.y) },
        });
      } else {
        // Cubic Bezier curve
        const cp1 = prevSegment.point.add(prevSegment.handleOut);
        const cp2 = point.add(segment.handleIn);

        const anchorPoint = { x: roundToPrecision(point.x), y: roundToPrecision(point.y) };

        commands.push({
          type: 'C',
          controlPoint1: {
            x: roundToPrecision(cp1.x),
            y: roundToPrecision(cp1.y),
            commandIndex: i,
            pointIndex: 0,
            anchor: { x: roundToPrecision(prevSegment.point.x), y: roundToPrecision(prevSegment.point.y) },
            isControl: true,
          },
          controlPoint2: {
            x: roundToPrecision(cp2.x),
            y: roundToPrecision(cp2.y),
            commandIndex: i,
            pointIndex: 1,
            anchor: anchorPoint,
            isControl: true,
          },
          position: anchorPoint,
        });
      }
    }
  }

  // Add close path command if the path is closed
  if (paperPath.closed && commands.length > 0) {
    // Check if there's a closing curve (from last segment back to first)
    const lastSegment = paperPath.segments[paperPath.segments.length - 1];
    const firstSegment = paperPath.segments[0];

    // If the first segment has handleIn, we need to create the closing curve command
    if (!firstSegment.handleIn.isZero() || !lastSegment.handleOut.isZero()) {
      const cp1 = lastSegment.point.add(lastSegment.handleOut);
      const cp2 = firstSegment.point.add(firstSegment.handleIn);

      commands.push({
        type: 'C',
        controlPoint1: {
          x: roundToPrecision(cp1.x),
          y: roundToPrecision(cp1.y),
          commandIndex: paperPath.segments.length,
          pointIndex: 0,
          anchor: { x: roundToPrecision(lastSegment.point.x), y: roundToPrecision(lastSegment.point.y) },
          isControl: true,
        },
        controlPoint2: {
          x: roundToPrecision(cp2.x),
          y: roundToPrecision(cp2.y),
          commandIndex: paperPath.segments.length,
          pointIndex: 1,
          anchor: { x: roundToPrecision(firstSegment.point.x), y: roundToPrecision(firstSegment.point.y) },
          isControl: true,
        },
        position: { x: roundToPrecision(firstSegment.point.x), y: roundToPrecision(firstSegment.point.y) },
      });
    }

    commands.push({ type: 'Z' });
  }

  return commands;
}
