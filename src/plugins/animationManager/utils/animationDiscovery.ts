/**
 * Animation Discovery — Core algorithm to resolve an element to all animations
 * affecting it, including direct and transitive (via defs) animations.
 */

import type { CanvasElement } from '../../../types';
import type { SVGAnimation, DefTargetType } from '../../animationSystem/types';
import type { DiscoveredAnimationGroup, DiscoveredElementAnimations } from '../types';
import { extractDefReferences } from '../../animationSystem/components/defReferences';
import { collectGroupDescendants } from '../../../utils/groupTraversalUtils';

/** Mapping from DefTargetType to the corresponding SVGAnimation field that references the def */
const DEF_TARGET_FIELDS: Record<DefTargetType, keyof SVGAnimation> = {
  gradient: 'gradientTargetId',
  pattern: 'patternTargetId',
  filter: 'filterTargetId',
  clipPath: 'clipPathTargetId',
  mask: 'maskTargetId',
  marker: 'markerTargetId',
  symbol: 'symbolTargetId',
};

/**
 * Find all animations that directly target a given element.
 */
function findDirectAnimations(
  elementId: string,
  animations: SVGAnimation[],
): SVGAnimation[] {
  return animations.filter(
    (anim) =>
      anim.targetElementId === elementId &&
      !anim.gradientTargetId &&
      !anim.patternTargetId &&
      !anim.filterTargetId &&
      !anim.clipPathTargetId &&
      !anim.maskTargetId &&
      !anim.markerTargetId &&
      !anim.symbolTargetId,
  );
}

/**
 * Find all animations targeting a specific def referenced by an element.
 */
function findIndirectAnimations(
  defType: DefTargetType,
  defId: string,
  animations: SVGAnimation[],
): SVGAnimation[] {
  const field = DEF_TARGET_FIELDS[defType];
  return animations.filter((anim) => {
    const targetDefId = anim[field] as string | undefined;
    return targetDefId === defId;
  });
}

/**
 * Get a human-readable display name for an element.
 */
function getElementName(element: CanvasElement): string {
  const data = element.data as Record<string, unknown>;
  const name = data.name as string | undefined;
  if (name) return name;

  // Fall back to type + truncated ID
  const shortId = element.id.length > 13 ? element.id.slice(0, 13) + '…' : element.id;
  return `${element.type} (${shortId})`;
}

/**
 * Discover all animations affecting a set of selected elements.
 * This is the core discovery algorithm that groups animations by relationship type.
 *
 * @param selectedIds - IDs of currently selected elements
 * @param elements - All canvas elements
 * @param animations - All registered animations
 * @param storeState - Access to gradients, patterns, filters, masks, etc.
 */
export function discoverAnimationsForSelection(
  selectedIds: string[],
  elements: CanvasElement[],
  animations: SVGAnimation[],
  storeState: Record<string, unknown>,
): DiscoveredElementAnimations[] {
  if (selectedIds.length === 0 || animations.length === 0) return [];

  const elementMap = new Map<string, CanvasElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
  }

  // Build a set of element IDs that have at least one animation targeting them
  const animatedElementIds = new Set<string>();
  for (const anim of animations) {
    animatedElementIds.add(anim.targetElementId);
  }

  // Expand: if a selected element is a group, include its descendants that have animations.
  // We include all descendants and let the discovery filter out those with zero animations.
  const expandedIds: string[] = [];
  const seen = new Set<string>();

  for (const id of selectedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    expandedIds.push(id);

    const el = elementMap.get(id);
    if (el?.type === 'group') {
      const descendants = collectGroupDescendants(id, elementMap);
      for (const descId of descendants) {
        if (seen.has(descId)) continue;
        seen.add(descId);
        expandedIds.push(descId);
      }
    }
  }

  const results: DiscoveredElementAnimations[] = [];

  for (const elementId of expandedIds) {
    const element = elementMap.get(elementId);
    if (!element) continue;

    const groups: DiscoveredAnimationGroup[] = [];

    // 1. Direct animations
    const directAnims = findDirectAnimations(elementId, animations);
    if (directAnims.length > 0) {
      groups.push({
        groupType: 'direct',
        groupLabel: 'Direct',
        animations: directAnims,
      });
    }

    // 2. Indirect animations via def references
    const gradients = storeState.gradients as Array<{ id: string; stops: unknown[]; type: string }> | undefined;
    const patterns = storeState.patterns as Array<{ id: string; type: string }> | undefined;
    const filters = storeState.filters as Record<string, { id: string; type: string; primitives?: unknown[] }> | undefined;
    const importedFilters = storeState.importedFilters as Array<{ id: string; type: string }> | undefined;
    const masks = storeState.masks as Array<{ id: string; name?: string }> | undefined;
    const markers = storeState.markers as Array<{ id: string; name: string }> | undefined;
    const symbols = storeState.symbols as Array<{ id: string; name: string }> | undefined;

    const defRefs = extractDefReferences(
      element,
      gradients as never,
      patterns as never,
      filters as never,
      importedFilters as never,
      masks as never,
      markers as never,
      symbols as never,
    );

    for (const ref of defRefs) {
      const indirectAnims = findIndirectAnimations(ref.type, ref.id, animations);
      if (indirectAnims.length > 0) {
        groups.push({
          groupType: ref.type,
          groupLabel: ref.label,
          defId: ref.id,
          animations: indirectAnims,
        });
      }
    }

    // Also check for clipPath animations referencing this element
    const clipPathAnims = animations.filter(
      (anim) => anim.clipPathTargetId && anim.targetElementId === elementId,
    );
    if (clipPathAnims.length > 0 && !groups.some((g) => g.groupType === 'clipPath')) {
      groups.push({
        groupType: 'clipPath',
        groupLabel: 'ClipPath',
        animations: clipPathAnims,
      });
    }

    const totalCount = groups.reduce((sum, g) => sum + g.animations.length, 0);

    // Only include elements that actually have animations (filters out group descendants with none)
    if (totalCount > 0) {
      results.push({
        elementId,
        elementName: getElementName(element),
        elementType: element.type,
        groups,
        totalCount,
      });
    }
  }

  return results;
}
