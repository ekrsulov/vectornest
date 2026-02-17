import type { CanvasElement, PathData } from '../types';
import type { CanvasStore } from '../store/canvasStore';
import { logger } from './logger';
import { ContributionRegistry } from './ContributionRegistry';

/**
 * Information about elements that were moved.
 */
export interface MovementContext {
  /** IDs of elements that were moved */
  movedElementIds: Set<string>;
  /** IDs of groups that were moved (their descendants were also moved) */
  movedGroupIds: Set<string>;
  /** Translation delta applied */
  deltaX: number;
  deltaY: number;
}

/**
 * Contribution for translating definitions when elements move.
 * Used by plugins like clipping, masks, patterns, etc. to update
 * their definitions when elements using them are moved.
 */
export interface DefinitionTranslationContribution {
  /** Unique ID for this contribution */
  id: string;
  /**
   * Called when elements are moved.
   * The contribution should check if any moved elements use its definitions
   * and update those definitions accordingly.
   * 
   * @param context Information about the movement
   * @param state Current store state
   * @param setState Function to update state
   */
  translateDefinitions: (
    context: MovementContext,
    state: CanvasStore,
    setState: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
  ) => void;
}

class DefinitionTranslationRegistry extends ContributionRegistry<DefinitionTranslationContribution> {

  /** Override to return a cleanup function for convenience. */
  override register(contribution: DefinitionTranslationContribution): () => void {
    super.register(contribution);
    return () => {
      this.unregister(contribution.id);
    };
  }

  /**
   * Called when elements are moved to notify all registered contributions.
   */
  notifyElementsMoved(
    context: MovementContext,
    state: CanvasStore,
    setState: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void
  ): void {
    this.contributions.forEach((contribution) => {
      try {
        contribution.translateDefinitions(context, state, setState);
      } catch (error) {
        logger.error(`Error in definition translation contribution ${contribution.id}:`, error);
      }
    });
  }
}

export const definitionTranslationRegistry = new DefinitionTranslationRegistry();

/**
 * Helper to collect all clip path IDs used by a set of elements.
 */
export function collectClipPathIds(
  elements: CanvasElement[],
  movedIds: Set<string>
): Set<string> {
  const clipIds = new Set<string>();
  elements.forEach((el) => {
    if (!movedIds.has(el.id)) return;
    const data = el.data as PathData;
    if (data?.clipPathId) {
      clipIds.add(data.clipPathId);
    }
    if (data?.clipPathTemplateId) {
      clipIds.add(data.clipPathTemplateId);
    }
  });
  return clipIds;
}

/**
 * Helper to collect all mask IDs used by a set of elements.
 */
export function collectMaskIds(
  elements: CanvasElement[],
  movedIds: Set<string>
): Set<string> {
  const maskIds = new Set<string>();
  elements.forEach((el) => {
    if (!movedIds.has(el.id)) return;
    const data = el.data as { maskId?: string };
    if (data?.maskId) {
      maskIds.add(data.maskId);
    }
  });
  return maskIds;
}
