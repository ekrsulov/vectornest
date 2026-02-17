import type { CanvasElement } from '../../types';
import { getElementBoundsAndArea } from './context';
import { MIN_CONTAINER_CONTENT_AREA_RATIO, type PathElementInfo } from './types';

/**
 * Get all path elements with their bounds, area and center.
 */
export function getPathElementsInfo(elements: CanvasElement[], zoom = 1): PathElementInfo[] {
  return elements
    .filter((el) => el.type === 'path')
    .map((el) => {
      const { bounds, area } = getElementBoundsAndArea(el, zoom);
      const center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };
      return { element: el, bounds, area, center };
    });
}

/**
 * Find feasible container-content pairs from a list of path elements.
 */
export function findFeasiblePairs(
  pathElements: PathElementInfo[]
): Array<{ container: CanvasElement; content: CanvasElement }> {
  const processedContent = new Set<string>();
  const feasiblePairs: Array<{ container: CanvasElement; content: CanvasElement }> = [];

  const sortedElements = [...pathElements].sort((a, b) => b.area - a.area);

  for (const contentCandidate of sortedElements) {
    if (processedContent.has(contentCandidate.element.id)) {
      continue;
    }

    let bestContainer: PathElementInfo | null = null;
    let bestDistance = Infinity;

    for (const containerCandidate of sortedElements) {
      if (containerCandidate.element.id === contentCandidate.element.id) {
        continue;
      }
      if (processedContent.has(containerCandidate.element.id)) {
        continue;
      }

      const ratio = containerCandidate.area / contentCandidate.area;

      if (ratio >= MIN_CONTAINER_CONTENT_AREA_RATIO) {
        const dx = containerCandidate.center.x - contentCandidate.center.x;
        const dy = containerCandidate.center.y - contentCandidate.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isNear =
          contentCandidate.center.x >= containerCandidate.bounds.minX - 50 &&
          contentCandidate.center.x <= containerCandidate.bounds.maxX + 50 &&
          contentCandidate.center.y >= containerCandidate.bounds.minY - 50 &&
          contentCandidate.center.y <= containerCandidate.bounds.maxY + 50;

        if (isNear && distance < bestDistance) {
          bestDistance = distance;
          bestContainer = containerCandidate;
        }
      }
    }

    if (bestContainer) {
      feasiblePairs.push({
        container: bestContainer.element,
        content: contentCandidate.element,
      });
      processedContent.add(contentCandidate.element.id);
      processedContent.add(bestContainer.element.id);
    }
  }

  return feasiblePairs;
}

/**
 * Helper to get container/content IDs from feasible pairs.
 */
export function getContainerContentIds(
  pairs: Array<{ container: CanvasElement; content: CanvasElement }>
): {
  containerIds: string[];
  contentIds: string[];
} {
  return {
    containerIds: pairs.map((pair) => pair.container.id),
    contentIds: pairs.map((pair) => pair.content.id),
  };
}
