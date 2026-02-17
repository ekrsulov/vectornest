import type { Point } from '../../types';
import type { SelectionStrategy, SelectionData } from '../../canvas/selection/SelectionStrategy';
import { isPointInPolygon, isBoundsIntersectingPolygon, isPointNearPolyline, isBoundsIntersectingPolyline } from './lassoGeometry';

/**
 * Lasso selection strategy - selects items within a free-form drawn path
 */
export class LassoSelectionStrategy implements SelectionStrategy {
  id = 'lasso';

  containsPoint(point: Point, selectionData: SelectionData): boolean {
    if (!selectionData.path || selectionData.path.length < 3) {
      return false;
    }
    
    if (selectionData.closed === false) {
      // For open lasso, check if point is near the line
      return isPointNearPolyline(point, selectionData.path);
    } else {
      // For closed lasso, use polygon containment
      return isPointInPolygon(point, selectionData.path);
    }
  }

  intersectsBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    selectionData: SelectionData
  ): boolean {
    if (!selectionData.path || selectionData.path.length < 3) {
      return false;
    }
    
    if (selectionData.closed === false) {
      // For open lasso, check if bounds intersect with the line
      return isBoundsIntersectingPolyline(bounds, selectionData.path);
    } else {
      // For closed lasso, use polygon intersection
      return isBoundsIntersectingPolygon(bounds, selectionData.path);
    }
  }
}
