import type { CanvasElement, PathData, Viewport } from '../types';
import { isGroupElement, isPathElement } from '../types';
import type { Bounds } from './boundsUtils';
import { calculateBounds } from './boundsUtils';
import { getGroupBounds } from '../canvas/geometry/CanvasGeometryService';
import { elementContributionRegistry } from './elementContributionRegistry';

interface CanvasElementBoundsContext {
  viewport: Viewport;
  elementMap: Map<string, CanvasElement>;
}

/**
 * Shared canvas-element bounds resolver used by snap systems and overlays.
 * Prefers element contributions, then falls back to core path/group strategies.
 */
export function getCanvasElementBounds(
  element: CanvasElement,
  context: CanvasElementBoundsContext
): Bounds | null {
  if (isGroupElement(element)) {
    return getGroupBounds(element, context.elementMap, context.viewport);
  }

  const contributionBounds = elementContributionRegistry.getBounds(element, {
    viewport: context.viewport,
    elementMap: context.elementMap,
  });
  if (contributionBounds) {
    return contributionBounds;
  }

  if (!isPathElement(element)) {
    return null;
  }

  const pathData = element.data as PathData;
  return calculateBounds(
    pathData.subPaths,
    (pathData as { strokeWidth?: number }).strokeWidth || 0,
    context.viewport.zoom
  );
}
