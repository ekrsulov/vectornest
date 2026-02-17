import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, PathElement, PathData } from '../../types/index';
import type { SelectSimilarSlice } from './slice';

type FullStore = CanvasStore & SelectSimilarSlice;
import { measurePath } from '../../utils/measurementUtils';

/**
 * Check if two elements have the same stroke properties
 */
function hasSameStroke(
  element1: PathElement,
  element2: PathElement,
  criteria: {
    color?: boolean;
    opacity?: boolean;
    width?: boolean;
    linecap?: boolean;
    linejoin?: boolean;
    dasharray?: boolean;
  }
): boolean {
  if (criteria.color && element1.data.strokeColor !== element2.data.strokeColor) return false;
  if (criteria.opacity && element1.data.strokeOpacity !== element2.data.strokeOpacity) return false;
  if (criteria.width && element1.data.strokeWidth !== element2.data.strokeWidth) return false;
  if (criteria.linecap && element1.data.strokeLinecap !== element2.data.strokeLinecap) return false;
  if (criteria.linejoin && element1.data.strokeLinejoin !== element2.data.strokeLinejoin) return false;
  if (criteria.dasharray && element1.data.strokeDasharray !== element2.data.strokeDasharray) return false;
  return true;
}

/**
 * Get actual size of an element based on its bounds
 */
function getElementSize(element: PathElement, zoom: number = 1): { width: number; height: number } {
  // Validate that element has path data with subPaths
  if (element.type !== 'path') {
    return { width: 0, height: 0 };
  }
  
  const pathData = element.data as PathData;
  if (!pathData?.subPaths || pathData.subPaths.length === 0) {
    return { width: 0, height: 0 };
  }
  
  const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, zoom);
  
  return {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * Get available criteria for the selected element
 * Returns all criteria regardless of whether values are default or not
 */
export function getAvailableCriteria(element: CanvasElement): string[] {
  if (element.type === 'group') return [];

  // Return all criteria for non-group elements
  return [
    'fillColor',
    'fillOpacity',
    'strokeColor',
    'strokeOpacity',
    'strokeWidth',
    'strokeLinecap',
    'strokeLinejoin',
    'strokeDasharray',
    'elementType',
    'width',
    'height',
  ];
}

/**
 * Apply selection by similarity based on criteria
 */
export function applySelectSimilar(store: CanvasStore, referenceId: string): void {
  const state = store as FullStore;
  const criteria = state.selectSimilar?.criteria;

  if (!criteria) return;

  const referenceElement = store.elements.find(el => el.id === referenceId);
  if (!referenceElement || referenceElement.type === 'group') return;

  const reference = referenceElement as PathElement;

  // Check if any criteria is selected
  const hasAnyCriteria = Object.values(criteria).some(v => v);
  if (!hasAnyCriteria) return;

  // Get zoom for size calculations
  const zoom = store.viewport?.zoom ?? 1;

  // Find all elements matching the criteria
  const matchingIds = store.elements
    .filter(element => {
      if (element.type === 'group') return false;

      const candidate = element as PathElement;

      // Check fill color criteria
      if (criteria.fillColor && reference.data.fillColor !== candidate.data.fillColor) {
        return false;
      }

      // Check fill opacity criteria
      if (criteria.fillOpacity && reference.data.fillOpacity !== candidate.data.fillOpacity) {
        return false;
      }

      // Check stroke criteria
      if (!hasSameStroke(reference, candidate, {
        color: criteria.strokeColor,
        opacity: criteria.strokeOpacity,
        width: criteria.strokeWidth,
        linecap: criteria.strokeLinecap,
        linejoin: criteria.strokeLinejoin,
        dasharray: criteria.strokeDasharray,
      })) {
        return false;
      }

      // Check element type
      if (criteria.elementType && element.type !== reference.type) {
        return false;
      }

      // Check dimensions
      if (criteria.width || criteria.height) {
        const refSize = getElementSize(reference, zoom);
        const candSize = getElementSize(candidate, zoom);
        
        if (criteria.width) {
          // Use a small tolerance for floating point comparison (1%)
          const widthDiff = Math.abs(refSize.width - candSize.width);
          const avgWidth = (refSize.width + candSize.width) / 2;
          if (avgWidth > 0 && widthDiff / avgWidth > 0.01) return false;
        }
        
        if (criteria.height) {
          // Use a small tolerance for floating point comparison (1%)
          const heightDiff = Math.abs(refSize.height - candSize.height);
          const avgHeight = (refSize.height + candSize.height) / 2;
          if (avgHeight > 0 && heightDiff / avgHeight > 0.01) return false;
        }
      }

      return true;
    })
    .map(el => el.id);

  // Apply selection using selectElements
  if (matchingIds.length > 0) {
    store.selectElements(matchingIds);
  }
}
