import type { CanvasElement } from '../../types';
import { prepareAlignmentContext } from './context';
import { applyProtectionPadding, translateSubPaths } from './offsets';
import type { AlignmentStrategy } from './types';

/**
 * Centralized helper to process feasible pairs with a given alignment strategy.
 */
export async function processFeasiblePairs(
  pairs: Array<{ container: CanvasElement; content: CanvasElement }>,
  strategy: AlignmentStrategy,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  zoom: number,
  withPadding = false
): Promise<void> {
  for (const pair of pairs) {
    const context = prepareAlignmentContext(pair.container, pair.content, zoom);

    let offset = await strategy(context);

    if (withPadding) {
      offset = applyProtectionPadding(offset, context.contentBounds, context.containerBounds);
    }

    const translatedSubPaths = translateSubPaths(context.contentData.subPaths, offset);

    updateElement(pair.content.id, {
      data: {
        ...context.contentData,
        subPaths: translatedSubPaths,
      },
    });
  }
}
