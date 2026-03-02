import type { StateCreator } from 'zustand';
import type { CanvasElement, Point, PathData, GroupElement, Viewport } from '../../types';

type FullStore = CanvasStore & ObjectSnapPluginSlice;
import { isPathElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { SnapPoint } from '../../utils/snapPointUtils';
import {
  getAllSnapPoints,
  findClosestSnapPoint,
} from '../../utils/snapPointUtils';
import { calculateBounds } from '../../utils/boundsUtils';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { buildElementMap } from '../../utils/elementMapUtils';

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
}
