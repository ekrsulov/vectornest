import type { PluginContextFull } from '../../../types/plugins';
import type { CanvasStore } from '../../../store/canvasStore';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasElement, PathData } from '../../../types';
import { calculateBounds, type Bounds } from '../../../utils/boundsUtils';
import type { ElementDragModifier, ElementDragContext } from '../../../types/interaction';
import { GUIDELINES_VELOCITY_THRESHOLD } from '../../../constants';
import { elementContributionRegistry } from '../../../utils/elementContributionRegistry';
import { buildElementMap } from '../../../utils';
import { calculateElementBoundsMap } from '../../../utils/guidelinesHelpers';

/**
 * Result of applying guidelines during drag
 */
interface GuidelinesDragResult {
  deltaX: number;
  deltaY: number;
  applied: boolean;
}

/**
 * Applies guidelines snapping during element drag.
 * This function calculates alignment, distance, and size guidelines
 * and applies sticky snap to the delta values.
 * 
 * For multi-selection or groups, calculates the combined bounding box
 * and excludes all selected elements (including group descendants) from
 * guideline matching.
 * 
 * @returns Modified delta values after applying snap
 */
function applyGuidelinesDuringDrag(
  originalDeltaX: number,
  originalDeltaY: number,
  selectedIds: string[]
): GuidelinesDragResult {
  const state = useCanvasStore.getState();
  
  // Early exit if guidelines not enabled or no selection
  if (!state.guidelines?.enabled || selectedIds.length === 0) {
    return { deltaX: originalDeltaX, deltaY: originalDeltaY, applied: false };
  }

  let deltaX = originalDeltaX;
  let deltaY = originalDeltaY;

  // Collect all IDs to exclude from guideline matching:
  // - All selected IDs
  // - All descendants of selected groups
  const excludeIds = new Set<string>(selectedIds);

  const elementMap = buildElementMap(state.elements);
  
  // Get group descendants for each selected element that is a group
  selectedIds.forEach(id => {
    const element = state.elements.find(el => el.id === id);
    if (element?.type === 'group' && state.getGroupDescendants) {
      const descendants = state.getGroupDescendants(id);
      descendants.forEach(descendantId => excludeIds.add(descendantId));
    }
  });

  // Calculate combined bounding box of all selected elements
  let combinedBounds: Bounds | null = null;

  const getElementBounds = (el: CanvasElement): Bounds | null => {
    const contributionBounds = elementContributionRegistry.getBounds(el, {
      viewport: state.viewport,
      elementMap,
    });
    if (contributionBounds) {
      return contributionBounds;
    }
    if (el.type === 'path') {
      const pathData = el.data as PathData;
      return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, state.viewport.zoom);
    }
    return null;
  };

  const accumulateBounds = (bounds: Bounds) => {
    if (combinedBounds === null) {
      combinedBounds = { ...bounds };
      return;
    }

    combinedBounds.minX = Math.min(combinedBounds.minX, bounds.minX);
    combinedBounds.minY = Math.min(combinedBounds.minY, bounds.minY);
    combinedBounds.maxX = Math.max(combinedBounds.maxX, bounds.maxX);
    combinedBounds.maxY = Math.max(combinedBounds.maxY, bounds.maxY);
  };

  for (const id of selectedIds) {
    const element = elementMap.get(id);
    if (!element) continue;

    if (element.type === 'group' && state.getGroupDescendants) {
      const descendants = state.getGroupDescendants(id);
      for (const descendantId of descendants) {
        const descendant = elementMap.get(descendantId);
        if (!descendant || descendant.type === 'group') continue;
        const bounds = getElementBounds(descendant);
        if (bounds && isFinite(bounds.minX)) {
          accumulateBounds(bounds);
        }
      }
    } else {
      const bounds = getElementBounds(element);
      if (bounds && isFinite(bounds.minX)) {
        accumulateBounds(bounds);
      }
    }
  }

  if (!combinedBounds) {
    return { deltaX, deltaY, applied: false };
  }

  const baseBounds = combinedBounds as Bounds;

  // Apply the delta to get the "would-be" position
  const projectedBounds = {
    minX: baseBounds.minX + deltaX,
    minY: baseBounds.minY + deltaY,
    maxX: baseBounds.maxX + deltaX,
    maxY: baseBounds.maxY + deltaY,
  };

  // Use the first selected ID as the reference, but pass all IDs to exclude
  const referenceId = selectedIds[0];
  const excludeIdsArray = Array.from(excludeIds);
  const precomputedBoundsMap = calculateElementBoundsMap(
    state.elements,
    excludeIdsArray,
    state.viewport.zoom,
    { includeStroke: true, isElementHidden: state.isElementHidden }
  );

  // Find alignment guidelines (excluding all selected elements and their descendants)
  const alignmentMatches = state.findAlignmentGuidelines?.(
    referenceId,
    projectedBounds,
    excludeIdsArray,
    precomputedBoundsMap
  ) ?? [];

  // Find distance guidelines if enabled (pass alignment matches for 2-element detection)
  const distanceMatches = (state.guidelines?.distanceEnabled && state.findDistanceGuidelines)
    ? state.findDistanceGuidelines(
      referenceId,
      projectedBounds,
      alignmentMatches,
      excludeIdsArray,
      precomputedBoundsMap
    )
    : [];

  // Find size matches if enabled
  const sizeMatches = (state.guidelines?.sizeMatchingEnabled && state.findSizeMatches)
    ? state.findSizeMatches(
      referenceId,
      projectedBounds,
      excludeIdsArray,
      precomputedBoundsMap
    )
    : [];

  // Update the guidelines state
  if (state.updateGuidelinesState) {
    state.updateGuidelinesState({
      currentMatches: alignmentMatches,
      currentDistanceMatches: distanceMatches,
      currentSizeMatches: sizeMatches,
    });
  }

  // Apply sticky snap - pass distance matches directly to avoid state sync issues
  if (state.checkStickySnap) {
    const snappedDelta = state.checkStickySnap(
      deltaX,
      deltaY,
      projectedBounds,
      distanceMatches,
      precomputedBoundsMap
    );
    deltaX = snappedDelta.x;
    deltaY = snappedDelta.y;
  }

  return { deltaX, deltaY, applied: true };
}

/**
 * Creates an ElementDragModifier for guidelines snapping.
 * This allows the guidelines plugin to participate in the drag modification pipeline
 * without direct coupling from the canvas core.
 */
export function createGuidelinesDragModifier(
  _context: PluginContextFull<CanvasStore>
): ElementDragModifier {
  // Track velocity state between frames
  let lastDragTime = 0;

  return {
    id: 'guidelines-snap',
    priority: 50, // Mid-priority - after grid (10) but before final adjustments
    modify: (
      deltaX: number,
      deltaY: number,
      context: ElementDragContext
    ) => {
      const currentTime = performance.now();
      const timeDelta = currentTime - lastDragTime;

      // Calculate velocity (distance per frame, normalized to ~16ms frame)
      // Only check velocity if we have a previous measurement
      if (lastDragTime > 0 && timeDelta > 0) {
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        // Normalize to a standard frame time (~16ms for 60fps)
        const normalizedVelocity = (distance / timeDelta) * 16;

        // If moving too fast, skip guidelines calculation for better performance
        if (normalizedVelocity > GUIDELINES_VELOCITY_THRESHOLD) {
          // Update tracking state
          lastDragTime = currentTime;

          // Clear any existing guidelines display
          const state = useCanvasStore.getState();
          if (state.guidelines?.currentMatches?.length || 
              state.guidelines?.currentDistanceMatches?.length || 
              state.guidelines?.currentSizeMatches?.length) {
            state.updateGuidelinesState?.({
              currentMatches: [],
              currentDistanceMatches: [],
              currentSizeMatches: [],
            });
          }

          // Return unchanged deltas without applying snap
          return { deltaX, deltaY, applied: false };
        }
      }

      // Update tracking state
      lastDragTime = currentTime;

      // Normal guidelines calculation when moving slowly enough
      const result = applyGuidelinesDuringDrag(deltaX, deltaY, context.selectedIds);
      return { deltaX: result.deltaX, deltaY: result.deltaY, applied: result.applied };
    },
    onDragEnd: () => {
      // Reset velocity tracking state
      lastDragTime = 0;

      // Clear guidelines when drag ends
      const state = useCanvasStore.getState();
      state.updateGuidelinesState?.({
        currentMatches: [],
        currentDistanceMatches: [],
        currentSizeMatches: [],
      });
    },
  };
}
