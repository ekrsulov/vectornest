import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, PathData } from '../../types';
import { debugLog, debugGroup } from '../../utils/debugUtils';
import {
  identifyContainerAndContent,
  prepareAlignmentContext,
  computeVisualAlignment,
  translateSubPaths,
  calculateMathematicalOffset,
  calculateBounds,
  mathematicalAlignmentStrategy,
  visualAlignmentStrategy,
  applyProtectionPadding,
  findFeasiblePairs,
  getPathElementsInfo,
  processFeasiblePairs,
  getContainerContentIds
} from '../../utils/opticalAlignment';

/**
 * Logs the result of an alignment operation in a standardized format.
 */
function logAlignmentResult(
  context: ReturnType<typeof prepareAlignmentContext>,
  visualCenter: { x: number; y: number } | undefined,
  offset: { x: number; y: number },
  label: string
): void {
  // Calculate content width/height for percentage display
  const contentWidth = context.contentBounds.maxX - context.contentBounds.minX;
  const contentHeight = context.contentBounds.maxY - context.contentBounds.minY;

  // Calculate visual center percentage relative to content bounds
  const visualCenterNormX = visualCenter ? (visualCenter.x - context.contentBounds.minX) / contentWidth : 0;
  const visualCenterNormY = visualCenter ? (visualCenter.y - context.contentBounds.minY) / contentHeight : 0;

  const visualCenterPercent = {
    x: (visualCenterNormX * 100).toFixed(1),
    y: (visualCenterNormY * 100).toFixed(1)
  };
  const movePercent = {
    x: ((offset.x / contentWidth) * 100).toFixed(1),
    y: ((offset.y / contentHeight) * 100).toFixed(1)
  };
  const horizontalDirection = offset.x > 0 ? 'right' : 'left';
  const verticalDirection = offset.y > 0 ? 'down' : 'up';

  debugLog(`\n${label}`);
  if (visualCenter) {
    debugLog(`The visual center is at ${visualCenterPercent.x}%, ${visualCenterPercent.y}%`);
  }
  debugLog(`You can visual center your element if you move it ${horizontalDirection} ${Math.abs(parseFloat(movePercent.x))}% and move it ${verticalDirection} ${Math.abs(parseFloat(movePercent.y))}%`);
}

interface OpticalAlignmentResult {
  containerElement: CanvasElement;
  contentElement: CanvasElement;
  visualCenter: { x: number; y: number };
  mathematicalCenter: { x: number; y: number };
  offset: { x: number; y: number };
}

export interface OpticalAlignmentSlice {
  // State
  opticalAlignmentResult: OpticalAlignmentResult | null;
  isCalculatingAlignment: boolean;

  // Actions
  calculateOpticalAlignment: () => Promise<void>;
  applyOpticalAlignment: () => void;
  clearOpticalAlignment: () => void;
  canPerformOpticalAlignment: () => boolean;
  applyOpticalAlignmentToAllPairs: () => Promise<void>;
  applyMathematicalAlignment: () => void;
  applyMathematicalAlignmentToAllPairs: () => Promise<void>; // Now async for consistency
  selectAllContainers: () => void;
  selectAllContents: () => void;
}



export const createOpticalAlignmentSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OpticalAlignmentSlice
> = (set, get) => ({
  // Initial state
  opticalAlignmentResult: null,
  isCalculatingAlignment: false,

  canPerformOpticalAlignment: () => {
    const state = get();
    const selectedElements = state.elements.filter(el =>
      state.selectedIds.includes(el.id) && el.type === 'path'
    );

    if (selectedElements.length !== 2) return false;

    // Use helpers to check if these elements form a feasible pair
    const pathElements = getPathElementsInfo(selectedElements, state.viewport.zoom);
    const feasiblePairs = findFeasiblePairs(pathElements);

    return feasiblePairs.length > 0;
  },

  calculateOpticalAlignment: async () => {
    const state = get();

    if (!get().canPerformOpticalAlignment?.()) {
      return;
    }

    set({ isCalculatingAlignment: true } as Partial<CanvasStore>);

    try {
      const selectedElements = state.elements.filter(el =>
        state.selectedIds.includes(el.id) && el.type === 'path'
      );

      // Use helpers to identify container/content and prepare context
      const { container, content } = identifyContainerAndContent(
        selectedElements[0],
        selectedElements[1],
        state.viewport.zoom
      );

      const context = prepareAlignmentContext(container, content, state.viewport.zoom);

      // Compute visual alignment using strategy
      const rawOffset = await visualAlignmentStrategy(context);

      // Apply protection padding to prevent content from getting too close to edges
      const offset = applyProtectionPadding(
        rawOffset,
        context.contentBounds,
        context.containerBounds
      );

      // Compute visual center for logging
      const { visualCenter, mathematicalCenter } = await computeVisualAlignment(context);

      const result: OpticalAlignmentResult = {
        containerElement: container,
        contentElement: content,
        visualCenter,
        mathematicalCenter,
        offset
      };

      // Log the result in both formats
      debugGroup('=== Optical Alignment Result ===', () => {
        debugLog('OpticalAlignmentResult:', {
          container: container.id,
          content: content.id,
          visualCenter,
          mathematicalCenter,
          offset
        });

        // Human-readable format
        logAlignmentResult(context, visualCenter, offset, content.id);
      });

      set({
        opticalAlignmentResult: result,
        isCalculatingAlignment: false
      } as Partial<CanvasStore>);
    } catch (error) {
      debugLog('Error calculating optical alignment:', error);
      set({
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    }
  },

  applyOpticalAlignment: () => {
    const state = get();
    const result = state.opticalAlignmentResult;

    if (!result) return;

    const contentData = result.contentElement.data as PathData;

    // Apply the offset to all subpaths
    const translatedSubPaths = translateSubPaths(contentData.subPaths, result.offset);

    // Update the element
    state.updateElement(result.contentElement.id, {
      data: {
        ...contentData,
        subPaths: translatedSubPaths
      }
    });

    // Clear the result
    set({ opticalAlignmentResult: null } as Partial<CanvasStore>);
  },

  clearOpticalAlignment: () => {
    set({ opticalAlignmentResult: null });
  },

  applyOpticalAlignmentToAllPairs: async () => {
    const state = get();
    set({ isCalculatingAlignment: true } as Partial<CanvasStore>);

    try {
      // Get all path elements with their bounds and areas using helper
      const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

      // Find all feasible pairs using the helper function
      const feasiblePairs = findFeasiblePairs(pathElements);

      debugLog(`\n=== Applying Optical Alignment to ${feasiblePairs.length} Pairs ===\n`);

      // Process each pair with visual alignment strategy and logging
      for (const pair of feasiblePairs) {
        // Prepare context for this pair
        const context = prepareAlignmentContext(
          pair.container,
          pair.content,
          state.viewport.zoom
        );

        // Compute visual alignment using strategy
        const rawOffset = await visualAlignmentStrategy(context);

        // Apply protection padding
        const offset = applyProtectionPadding(
          rawOffset,
          context.contentBounds,
          context.containerBounds
        );

        // Compute visual center for logging
        const { visualCenter, mathematicalCenter } = await computeVisualAlignment(context);

        // Log the result for this pair
        debugGroup(`Optical Alignment: ${pair.container.id} → ${pair.content.id}`, () => {
          debugLog('OpticalAlignmentResult:', {
            container: pair.container.id,
            content: pair.content.id,
            visualCenter,
            mathematicalCenter,
            offset
          });

          // Human-readable format
          logAlignmentResult(context, visualCenter, offset, pair.content.id);
        });

        // Apply the offset to all subpaths
        const translatedSubPaths = translateSubPaths(context.contentData.subPaths, offset);

        // Update the element
        state.updateElement(pair.content.id, {
          data: {
            ...context.contentData,
            subPaths: translatedSubPaths
          }
        });
      }

      set({
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    } catch (error) {
      debugLog('Error applying optical alignment to all pairs:', error);
      set({
        isCalculatingAlignment: false,
        opticalAlignmentResult: null
      } as Partial<CanvasStore>);
    }
  },

  applyMathematicalAlignment: () => {
    const state = get();

    if (!get().canPerformOpticalAlignment?.()) {
      return;
    }

    const selectedElements = state.elements.filter(el =>
      state.selectedIds.includes(el.id) && el.type === 'path'
    );

    // Use helper to identify container and content
    const { container, content } = identifyContainerAndContent(
      selectedElements[0],
      selectedElements[1],
      state.viewport.zoom
    );

    const containerData = container.data as PathData;
    const contentData = content.data as PathData;

    // Calculate bounds using helper
    const containerBounds = calculateBounds(
      containerData.subPaths,
      containerData.strokeWidth || 0,
      state.viewport.zoom
    );
    const contentBounds = calculateBounds(
      contentData.subPaths,
      contentData.strokeWidth || 0,
      state.viewport.zoom
    );

    // Calculate offset using helper function
    const offset = calculateMathematicalOffset(containerBounds, contentBounds);

    // Apply the offset to all subpaths
    const translatedSubPaths = translateSubPaths(contentData.subPaths, offset);

    // Update the element
    state.updateElement(content.id, {
      data: {
        ...contentData,
        subPaths: translatedSubPaths
      }
    });
  },

  applyMathematicalAlignmentToAllPairs: async () => {
    const state = get();

    // Get all path elements with their bounds and areas using helper
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

    // Find all feasible pairs using the helper function
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Use centralized helper with mathematical alignment strategy
    await processFeasiblePairs(
      feasiblePairs,
      mathematicalAlignmentStrategy,
      state.updateElement,
      state.viewport.zoom,
      false // No protection padding for mathematical alignment
    );
  },

  selectAllContainers: () => {
    const state = get();

    // Get all path elements info using helper
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

    // Find all feasible pairs
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Use centralized helper to extract IDs
    const { containerIds } = getContainerContentIds(feasiblePairs);

    // Select all containers
    state.selectElements(containerIds);
  },

  selectAllContents: () => {
    const state = get();

    // Get all path elements info using helper
    const pathElements = getPathElementsInfo(state.elements, state.viewport.zoom);

    // Find all feasible pairs
    const feasiblePairs = findFeasiblePairs(pathElements);

    // Use centralized helper to extract IDs
    const { contentIds } = getContainerContentIds(feasiblePairs);

    // Select all contents
    state.selectElements(contentIds);
  }
});
