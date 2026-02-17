import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasElement, GroupElement, Viewport } from '../types';
import { getAllSnapPoints, type SnapPoint } from '../utils/snapPointUtils';
import { buildElementMap } from '../utils';
import { getCanvasElementBounds } from '../utils/canvasElementBounds';

const EMPTY_ELEMENTS: CanvasElement[] = [];

export interface UseSnapPointsCacheOptions {
  /**
   * The plugin ID to activate the cache for (e.g., 'arrows', 'measure')
   */
  pluginId: string;
  /**
   * Function to call when snap points are refreshed
   */
  onRefresh: ((snapPoints: SnapPoint[]) => void) | undefined;
}

/**
 * Hook that manages snap points cache for a plugin.
 * Refreshes the cache when entering the specified plugin mode.
 * 
 * This hook consolidates the duplicate logic from arrows and measure plugins.
 * 
 * @example
 * ```tsx
 * useSnapPointsCache({
 *   pluginId: 'arrows',
 *   onRefresh: refreshArrowsSnapPointsCache
 * });
 * ```
 */
export function useSnapPointsCache({ pluginId, onRefresh }: UseSnapPointsCacheOptions): void {
  // Consolidated store subscription via useShallow to minimize subscription count
  const {
    activePlugin,
    elements,
    viewport,
    snapToAnchors,
    snapToMidpoints,
    snapToBBoxCorners,
    snapToBBoxCenter,
    snapToIntersections,
  } = useCanvasStore(
    useShallow((state) => ({
      activePlugin: state.activePlugin,
      elements: state.activePlugin === pluginId ? state.elements : EMPTY_ELEMENTS,
      viewport: state.viewport as Viewport | undefined,
      snapToAnchors: state.snapPoints?.snapToAnchors,
      snapToMidpoints: state.snapPoints?.snapToMidpoints,
      snapToBBoxCorners: state.snapPoints?.snapToBBoxCorners,
      snapToBBoxCenter: state.snapPoints?.snapToBBoxCenter,
      snapToIntersections: state.snapPoints?.snapToIntersections,
    }))
  );
  const zoom = viewport?.zoom ?? 1;

  useEffect(() => {
    if (activePlugin !== pluginId) return;

    // Build element map for group handling
    const elementMap = buildElementMap(elements);

    const effectiveViewport = viewport ?? { zoom, panX: 0, panY: 0 };
    const getElementBounds = (element: CanvasElement) =>
      getCanvasElementBounds(element, {
        viewport: effectiveViewport,
        elementMap,
      });

    const snapPointsList = getAllSnapPoints(elements, getElementBounds, {
      snapToAnchors: snapToAnchors ?? true,
      snapToMidpoints: snapToMidpoints ?? true,
      snapToBBoxCorners: snapToBBoxCorners ?? true,
      snapToBBoxCenter: snapToBBoxCenter ?? true,
      snapToIntersections: snapToIntersections ?? true,
      elementMap,
      getGroupBounds: viewport 
        ? (group: GroupElement, elMap: Map<string, CanvasElement>) =>
            getCanvasElementBounds(group, {
              viewport,
              elementMap: elMap,
            })
        : undefined
    });

    onRefresh?.(snapPointsList);
  }, [
    activePlugin,
    pluginId,
    elements,
    viewport,
    zoom,
    snapToAnchors,
    snapToMidpoints,
    snapToBBoxCorners,
    snapToBBoxCenter,
    snapToIntersections,
    onRefresh
  ]);
}
