import { extractEditablePoints } from '../../utils/pathParserUtils';
import { measurePath, measureSubpathBounds } from '../../utils/measurementUtils';
import type { PathData, CanvasElement, GroupElement } from '../../types';
import { selectionStrategyRegistry, type SelectionData } from '../selection/SelectionStrategy';
import { applyToPoint } from '../../utils/matrixUtils';
import { buildElementMap } from '../../utils/elementMapUtils';
import { getAccumulatedTransformMatrix } from '../../utils/elementTransformUtils';
import type { PluginSelectionMode } from '../../types/plugins';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { getGroupBounds } from '../geometry/CanvasGeometryService';
import { boundsFromCorners } from '../../utils/boundsUtils';

export interface SelectionCallbacks {
  selectCommands: (commands: Array<{ elementId: string; commandIndex: number; pointIndex: number }>, isShiftPressed: boolean) => void;
  selectSubpaths: (subpaths: Array<{ elementId: string; subpathIndex: number }>, isShiftPressed: boolean) => void;
  selectElements: (elementIds: string[], isShiftPressed: boolean) => void;
}

/**
 * Complete the selection using the appropriate strategy.
 * Uses the plugin's declared selectionMode instead of hardcoded plugin IDs.
 */
export function completeSelection(
  selectionData: SelectionData,
  strategyId: string,
  selectionMode: PluginSelectionMode,
  elements: CanvasElement[],
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks,
  selectedIds?: string[],
  getFilteredEditablePoints?: (elementId: string) => Array<{ x: number; y: number; commandIndex: number; pointIndex: number }>,
  elementMap?: Map<string, CanvasElement>
): void {
  const strategy = selectionStrategyRegistry.get(strategyId);
  const resolvedElementMap = elementMap ?? buildElementMap(elements);

  switch (selectionMode) {
    case 'commands':
      completeEditSelection(
        strategy,
        selectionData,
        elements,
        resolvedElementMap,
        isShiftPressed,
        callbacks,
        selectedIds,
        getFilteredEditablePoints
      );
      break;
    case 'subpaths':
      completeSubpathSelection(strategy, selectionData, elements, viewportZoom, isShiftPressed, callbacks);
      break;
    case 'elements':
    default:
      completeElementSelection(
        strategy,
        selectionData,
        elements,
        resolvedElementMap,
        viewportZoom,
        isShiftPressed,
        callbacks
      );
      break;
  }
}

function completeEditSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  elementMap: Map<string, CanvasElement>,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks,
  selectedIds?: string[],
  getFilteredEditablePoints?: (elementId: string) => Array<{ x: number; y: number; commandIndex: number; pointIndex: number }>
): void {
  const selectedCommands: Array<{ elementId: string; commandIndex: number; pointIndex: number }> = [];

  // In edit mode, only process elements that are currently selected
  const elementsToProcess = selectedIds && selectedIds.length > 0
    ? (() => { const idSet = new Set(selectedIds); return elements.filter(el => idSet.has(el.id)); })()
    : elements;

  elementsToProcess.forEach(el => {
    if (el.type === 'path') {
      // Use filtered points if available (respects subpath selection)
      const points = getFilteredEditablePoints
        ? getFilteredEditablePoints(el.id)
        : extractEditablePoints((el.data as PathData).subPaths.flat());

      // Get element transform matrix
      const matrix = getAccumulatedTransformMatrix(el.id, elementMap);

      points.forEach(point => {
        // Transform point to global coordinates
        const transformedPoint = applyToPoint(matrix, { x: point.x, y: point.y });

        if (strategy.containsPoint(transformedPoint, selectionData)) {
          selectedCommands.push({
            elementId: el.id,
            commandIndex: point.commandIndex,
            pointIndex: point.pointIndex
          });
        }
      });
    }
  });

  callbacks.selectCommands(selectedCommands, isShiftPressed);
}

function completeSubpathSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks
): void {
  const selectedSubpathsList: Array<{ elementId: string; subpathIndex: number }> = [];

  elements.forEach(el => {
    if (el.type === 'path') {
      const pathData = el.data as PathData;

      pathData.subPaths.forEach((subpathData, index) => {
        const subpathBounds = measureSubpathBounds(subpathData, pathData.strokeWidth ?? 1, viewportZoom);

        if (strategy.intersectsBounds(subpathBounds, selectionData)) {
          selectedSubpathsList.push({
            elementId: el.id,
            subpathIndex: index
          });
        }
      });
    }
  });

  callbacks.selectSubpaths(selectedSubpathsList, isShiftPressed);
}

function completeElementSelection(
  strategy: import('../selection/SelectionStrategy').SelectionStrategy,
  selectionData: SelectionData,
  elements: CanvasElement[],
  elementMap: Map<string, CanvasElement>,
  viewportZoom: number,
  isShiftPressed: boolean,
  callbacks: SelectionCallbacks
): void {
  // Only consider root elements (those without a parentId) for selection
  // Child elements inside groups are selected by selecting the parent group
  const rootElements = elements.filter(el => !el.parentId);

  const selectedElementIds = rootElements
    .filter(el => {
      // Calculate global transform matrix
      const matrix = getAccumulatedTransformMatrix(el.id, elementMap);

      if (el.type === 'path') {
        const pathData = el.data as PathData;

        // Check if any point in the path (transformed) is inside the selection area
        // NOTE: Strictly speaking we should transform the path/bounds. 
        // For performance, transforming bounds might be acceptable, but for "contains" queries,
        // transforming the bounding box corners isn't always accurate for rotated shapes.
        // However, standard "intersectsBounds" usually works on Axis Aligned Bounding Boxes (AABB).
        // If we rotate a box, its AABB grows.

        // 1. Measure local bounds
        const localBounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1); // Zoom 1 for local

        // 2. Transform the 4 corners of local bounds to get global bounds
        const corners = [
          { x: localBounds.minX, y: localBounds.minY },
          { x: localBounds.maxX, y: localBounds.minY },
          { x: localBounds.maxX, y: localBounds.maxY },
          { x: localBounds.minX, y: localBounds.maxY }
        ].map(p => applyToPoint(matrix, p));

        // 3. Compute AABB of transformed corners
        const globalBounds = boundsFromCorners(corners);

        return strategy.intersectsBounds(globalBounds, selectionData);
      }

      if (el.type === 'group') {
        // Calculate group bounds from children and check intersection
        // getGroupBounds already returns bounds in global coordinates (transforms are applied internally)
        const groupBounds = getGroupBounds(
          el as GroupElement,
          elementMap,
          { zoom: viewportZoom, panX: 0, panY: 0 }
        );

        if (!groupBounds) return false;

        // No need to apply matrix - getGroupBounds already returns global coordinates
        return strategy.intersectsBounds(groupBounds, selectionData);
      }

      const bounds = elementContributionRegistry.getBounds(el, {
        viewport: { zoom: viewportZoom, panX: 0, panY: 0 },
        elementMap,
      });

      if (!bounds) return false;

      // Transform bounds for other elements too
      const corners = [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
        { x: bounds.minX, y: bounds.maxY }
      ].map(p => applyToPoint(matrix, p));

      const globalBounds = boundsFromCorners(corners);

      return strategy.intersectsBounds(globalBounds, selectionData);
    })
    .map(el => el.id);

  if (selectedElementIds.length > 0) {
    callbacks.selectElements(selectedElementIds, isShiftPressed);
  } else if (!isShiftPressed) {
    callbacks.selectElements([], false);
  }
}
