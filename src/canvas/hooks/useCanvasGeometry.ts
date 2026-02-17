import { useCallback, useMemo } from 'react';
import type { CanvasElement, GroupElement, Viewport } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';
import {
  getElementBounds as serviceGetElementBounds,
  getGroupBounds as serviceGetGroupBounds,
  measureSelectionBounds as serviceMeasureSelectionBounds,
  type ElementMap,
  type ElementVisibilityChecker,
} from '../geometry/CanvasGeometryService';

interface UseCanvasGeometryParams {
  elementMap: ElementMap;
  viewport: Viewport;
  selectedIds: string[];
  isElementHidden?: ElementVisibilityChecker;
}

interface UseCanvasGeometryResult {
  getElementBounds: (element: CanvasElement) => Bounds | null;
  getGroupBounds: (group: GroupElement) => Bounds | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;
}

export const useCanvasGeometry = ({
  elementMap,
  viewport,
  selectedIds,
  isElementHidden,
}: UseCanvasGeometryParams): UseCanvasGeometryResult => {
  // Get element bounds including transformations (formerly getTransformedBounds)
  const getElementBounds = useCallback(
    (element: CanvasElement) => serviceGetElementBounds(element, viewport, elementMap),
    [viewport, elementMap]
  );

  const getGroupBounds = useCallback(
    (group: GroupElement) => serviceGetGroupBounds(group, elementMap, viewport, isElementHidden),
    [elementMap, viewport, isElementHidden]
  );

  const selectedGroupBounds = useMemo(
    () => serviceMeasureSelectionBounds(selectedIds, elementMap, viewport, isElementHidden),
    [selectedIds, elementMap, viewport, isElementHidden]
  );

  return useMemo(
    () => ({
      getElementBounds,
      getGroupBounds,
      selectedGroupBounds,
    }),
    [getElementBounds, getGroupBounds, selectedGroupBounds]
  );
};
