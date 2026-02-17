import type { StateCreator } from 'zustand';
import type { CanvasElement, Point, PathData, GroupElement, Viewport } from '../../types';

type FullStore = CanvasStore & ObjectSnapPluginSlice;
import { isPathElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { SnapPoint } from '../../utils/snapPointUtils';
import {
  getAllSnapPoints,
  findClosestSnapPoint,
  findPathSnapPoint
} from '../../utils/snapPointUtils';
import { screenDistance } from '../../utils/math';
import { calculateBounds } from '../../utils/boundsUtils';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { buildElementMap } from '../../utils';

export type { SnapPoint };

function areSnapPointListsEqual(a: SnapPoint[] | null | undefined, b: SnapPoint[] | null | undefined): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    if (
      pa.point.x !== pb.point.x ||
      pa.point.y !== pb.point.y ||
      pa.type !== pb.type ||
      pa.elementId !== pb.elementId ||
      (pa.metadata?.commandIndex ?? null) !== (pb.metadata?.commandIndex ?? null) ||
      (pa.metadata?.pointIndex ?? null) !== (pb.metadata?.pointIndex ?? null)
    ) {
      return false;
    }
  }

  return true;
}

export interface ObjectSnapState {
  enabled: boolean;
  currentSnapPoint: SnapPoint | null;
  availableSnapPoints: SnapPoint[];
  staticSnapPoints: SnapPoint[]; // Snap points from non-selected elements (cached)
  selectedSnapPoints: SnapPoint[]; // Snap points from selected elements (updated during drag)
  // Cache
  cachedSnapPoints: SnapPoint[] | null;
  cacheKey: string | null; // Hash of elements to detect changes
}

// All snap point extraction logic is now in utils/snapPointUtils.ts

export const createObjectSnapPluginSlice: StateCreator<
  ObjectSnapPluginSlice,
  [],
  [],
  ObjectSnapPluginSlice
> = (set, get) => {
  return {
    // Initial state
    objectSnap: {
      enabled: true,
      currentSnapPoint: null,
      availableSnapPoints: [],
      staticSnapPoints: [], // Snap points from non-selected elements (cached)
      selectedSnapPoints: [], // Snap points from selected elements (updated during drag)
      cachedSnapPoints: [],
      cacheKey: '',
    },

    // Actions
    updateObjectSnapState: (updates) => {
      set((state) => ({
        objectSnap: {
          ...state.objectSnap,
          ...updates,
        },
      }));
    },

    invalidateObjectSnapCache: () => {
      set((state) => ({
        objectSnap: {
          ...state.objectSnap,
          cachedSnapPoints: null,
          cacheKey: null,
          // Also clear availableSnapPoints to prevent flash of stale data
          availableSnapPoints: [],
        },
      }));
    },

    clearCurrentSnapPoint: () => {
      set((state) => ({
        objectSnap: {
          ...state.objectSnap,
          currentSnapPoint: null,
        },
      }));
    },

    // New: Find snap points only for specific elements (for performance during drag)
    findSnapPointsForElements: (elementIds: string[], viewport: { zoom: number } | undefined) => {
      const state = get() as FullStore;
      const elements = state.elements;
      const objectSnap = state.objectSnap;

      // Get global snap points settings
      const snapPoints = state.snapPoints;

      if (!objectSnap.enabled) {
        return [];
      }

      const targetElements = elements.filter(el => elementIds.includes(el.id));

      // Build element map for group handling
      const elementMap = new Map<string, CanvasElement>();
      for (const el of elements) {
        elementMap.set(el.id, el);
      }

      // Create a getElementBounds function for getAllSnapPoints
      const getElementBounds = (element: CanvasElement) => {
        if (!isPathElement(element)) {
          return null;
        }
        const pathData = element.data as PathData;
        return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, viewport?.zoom || 1);
      };

      // Use getAllSnapPoints with global snap settings
      // IMPORTANT: Exclude the target elements from intersection calculations
      // to prevent false intersection points when dragging a point
      const snapPointsList = getAllSnapPoints(
        targetElements,
        getElementBounds,
        {
          snapToAnchors: snapPoints?.snapToAnchors ?? true,
          snapToMidpoints: snapPoints?.snapToMidpoints ?? true,
          snapToBBoxCorners: snapPoints?.snapToBBoxCorners ?? true,
          snapToBBoxCenter: snapPoints?.snapToBBoxCenter ?? true,
          snapToIntersections: snapPoints?.snapToIntersections ?? true,
          excludeElementIds: elementIds, // Exclude the elements being edited from intersections
          elementMap,
          getGroupBounds: viewport
            ? (group: GroupElement, elMap: Map<string, CanvasElement>) => getGroupBounds(group, elMap, viewport as Viewport)
            : undefined
        }
      );

      return snapPointsList;
    },
    findAvailableSnapPoints: (excludeElementIds, options) => {
      const state = get() as FullStore;
      const elements = state.elements as CanvasElement[];
      const objectSnap = state.objectSnap;

      // Get global snap points settings
      const snapPoints = state.snapPoints;

      // Generate cache key from elements (excluding the ones being edited and hidden)
      const relevantElements = elements.filter((el: CanvasElement) =>
        !excludeElementIds.includes(el.id) &&
        (!state.isElementHidden || !state.isElementHidden(el.id))
      );

      const cacheKey = relevantElements
        .map((el: CanvasElement) => el.id)
        .sort()
        .join('|');

      // Check if cache is valid
      if (!options?.force && objectSnap?.cachedSnapPoints && objectSnap.cacheKey === cacheKey) {
        return objectSnap.cachedSnapPoints;
      }

      // Build element map for group handling
      const elementMap = buildElementMap(elements);

      // Get bounds function - same as measure plugin
      const getElementBounds = (element: CanvasElement) => {
        if (element.type === 'group') return null;
        const contributionBounds = elementContributionRegistry.getBounds(element, {
          viewport: viewport ?? { zoom: 1, panX: 0, panY: 0 },
          elementMap,
        });

        if (contributionBounds) {
          return contributionBounds;
        }

        if (!isPathElement(element)) return null;
        const pathData = element.data;
        if (!pathData?.subPaths) return null;

        // Get zoom from viewport
        const zoom = viewport?.zoom ?? 1;

        return calculateBounds(pathData.subPaths, (pathData as { strokeWidth?: number }).strokeWidth || 0, zoom);
      };

      // Get viewport for group bounds calculation
      const viewport = state.viewport as Viewport | undefined;

      // Collect all exclude element IDs (editing + hidden)
      const allExcludeIds = [
        ...excludeElementIds,
        ...elements.filter(el => state.isElementHidden?.(el.id)).map(el => el.id)
      ];

      // Use unified snap point utilities with global settings
      const snapPointsList = getAllSnapPoints(elements, getElementBounds, {
        snapToAnchors: snapPoints?.snapToAnchors ?? true,
        snapToMidpoints: snapPoints?.snapToMidpoints ?? true,
        snapToBBoxCorners: snapPoints?.snapToBBoxCorners ?? true,
        snapToBBoxCenter: snapPoints?.snapToBBoxCenter ?? true,
        snapToIntersections: snapPoints?.snapToIntersections ?? true,
        excludeElementIds: allExcludeIds,
        elementMap,
        getGroupBounds: viewport
          ? (group: GroupElement, elMap: Map<string, CanvasElement>) => getGroupBounds(group, elMap, viewport)
          : undefined
      });

      // Update cache
      // Avoid state updates if nothing changed to prevent re-render loops
      if (
        objectSnap?.cacheKey === cacheKey &&
        areSnapPointListsEqual(snapPointsList, objectSnap?.availableSnapPoints)
      ) {
        return objectSnap?.availableSnapPoints ?? snapPointsList;
      }

      set((current) => ({
        objectSnap: {
          ...current.objectSnap,
          cachedSnapPoints: snapPointsList,
          cacheKey,
          availableSnapPoints: snapPointsList,
          staticSnapPoints: snapPointsList, // Store for performance optimization
        },
      }));

      return snapPointsList;
    },

    findClosestSnapPoint: (position, availableSnapPoints, threshold) => {
      // Use unified utility - threshold is already in canvas units
      // We need to pass zoom = 1 since threshold is already in canvas space
      return findClosestSnapPoint(position, availableSnapPoints, threshold, 1);
    },

    /**
     * @deprecated Use snapManager.snap() from src/snap/SnapManager.ts instead.
     * This legacy function is kept for backwards compatibility with plugins that haven't migrated yet.
     * The centralized snap system (snapManager + ObjectSnapSource) provides the same functionality
     * and integrates with the unified snap store for overlay visualization.
     */
    applyObjectSnap: (position, excludeElementIds, options) => {
      const state = get() as FullStore;

      // If object snap is disabled, return original position
      if (!state.objectSnap?.enabled) {
        return position;
      }

      // Get global snap points settings
      const snapPoints = state.snapPoints;

      // Get viewport to convert threshold from screen pixels to canvas coordinates
      const viewport = state.viewport as { zoom: number } | undefined;
      const zoom = viewport?.zoom ?? 1;

      // Convert threshold from screen pixels to canvas coordinates using global setting
      const thresholdInCanvas = (snapPoints?.snapThreshold ?? 10) / zoom;

      // Find available snap points (anchors, midpoints, bbox, intersections)
      // These have PRIORITY over edge snap
      let availableSnapPoints = state.findAvailableSnapPoints ?
        state.findAvailableSnapPoints(excludeElementIds) : [];

      // Filter out the specific point being edited if provided
      const activePoint = options?.dragPointInfo;
      if (activePoint) {
        const { elementId } = activePoint;
        const commandIndex = activePoint.commandIndex ?? activePoint.pointIndex ?? 0;
        availableSnapPoints = availableSnapPoints.filter((snapPoint: SnapPoint) => {
          // Exclude the exact point being edited
          if (snapPoint.elementId === elementId &&
            (snapPoint.metadata?.commandIndex === commandIndex || snapPoint.metadata?.commandIndex === activePoint?.pointIndex) &&
            snapPoint.metadata?.pointIndex === 0) {  // Anchor points have pointIndex 0
            return false;
          }

          // Also exclude points very close to current position (safety fallback)
          const dx = snapPoint.point.x - position.x;
          const dy = snapPoint.point.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 0.5) {
            return false;
          }

          return true;
        });
      }

      // Find closest high-priority snap point
      let closestSnap = state.findClosestSnapPoint ?
        state.findClosestSnapPoint(position, availableSnapPoints, thresholdInCanvas) : null;

      let closestDistance = closestSnap ? screenDistance(position, closestSnap.point, zoom) : Infinity;

      // Only check edge snap if enabled AND no high-priority snap found within threshold
      if (snapPoints?.snapToPath && !closestSnap) {
        const elements = state.elements as CanvasElement[];

        // Build list of commands to exclude for edge snap
        // When moving a point at commandIndex, we need to exclude:
        // 1. The segment at commandIndex (terminates at the point)
        // 2. The segment at commandIndex+1 (starts from the point)
        let excludeCommands: Array<{ subpathIndex: number; commandIndex: number }> | undefined;

        const activePoint = options?.dragPointInfo;
        if (activePoint) {
          const { elementId } = activePoint;
          const commandIndex = activePoint.commandIndex ?? activePoint.pointIndex ?? 0;
          // pointIndex here is actually the commandIndex (global)
          excludeCommands = [
            { subpathIndex: 0, commandIndex },     // Segment ending at this point
            { subpathIndex: 0, commandIndex: commandIndex + 1 }, // Segment starting from this point
          ];

          // Also need to handle case where point is at start of path (M command)
          // In that case, exclude the first segment (commandIndex 1) and possibly Z command
          if (commandIndex === 0) {
            // For M command, only the next segment starts from it
            excludeCommands = [
              { subpathIndex: 0, commandIndex: 1 },
            ];

            // Check if path is closed (has Z command) - the Z segment also connects to first point
            const element = elements.find(el => el.id === elementId);
            if (element && isPathElement(element) && element.data?.subPaths) {
              const commands = element.data.subPaths.flat();
              const zIndex = commands.findIndex(cmd => cmd.type === 'Z');
              if (zIndex !== -1) {
                excludeCommands.push({ subpathIndex: 0, commandIndex: zIndex });
              }
            }
          }
        }

        const relevantElements = elements.filter((el: CanvasElement) =>
          isPathElement(el) &&
          (!state.isElementHidden || !state.isElementHidden(el.id))
        );

        // Check edge snap for each element
        for (const element of relevantElements) {
          // Only apply exclude commands to the element being edited
          const elementExcludeCommands = options?.dragPointInfo?.elementId === element.id
            ? excludeCommands
            : undefined;

          const pathSnap = findPathSnapPoint(
            position,
            element,
            snapPoints?.snapThreshold ?? 10,
            zoom,
            { excludeCommands: elementExcludeCommands }
          );
          if (pathSnap) {
            const dist = screenDistance(position, pathSnap.point, zoom);
            if (dist < closestDistance) {
              closestDistance = dist;
              closestSnap = pathSnap;
            }
          }
        }
      }

      // Update current snap point for visualization
      set((current) => ({
        objectSnap: {
          ...current.objectSnap,
          currentSnapPoint: closestSnap,
          availableSnapPoints,
        },
      }));

      // Return snapped position if found, otherwise original
      if (closestSnap) {
        return closestSnap.point;
      }

      return position;
    },
  };
};

export interface ObjectSnapPluginSlice {
  objectSnap: ObjectSnapState;
  updateObjectSnapState: (updates: Partial<ObjectSnapState>) => void;
  invalidateObjectSnapCache: () => void;
  clearCurrentSnapPoint: () => void;
  findAvailableSnapPoints: (excludeElementIds: string[], options?: { force?: boolean }) => SnapPoint[];
  findClosestSnapPoint: (
    position: Point,
    availableSnapPoints: SnapPoint[],
    threshold: number
  ) => SnapPoint | null;
  applyObjectSnap: (
    position: Point,
    excludeElementIds: string[],
    options?: {
      dragPointInfo?: {
        elementId: string;
        subpathIndex: number;
        pointIndex: number;
        commandIndex?: number;
      } | null;
    }
  ) => Point;
}
