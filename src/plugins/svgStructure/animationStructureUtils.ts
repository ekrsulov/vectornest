import type { SvgStructureContributionProps } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import type { AnimationSelectValue } from '../animationSystem/animationPresets';
import { getReferencedIds } from '../../utils/referenceUtils';
import type { CanvasElement, GroupElement } from '../../types';
import { generateShortId } from '../../utils/idGenerator';

export const PRESET_OPTIONS: { value: AnimationSelectValue; label: string }[] = [
  { value: 'fadeIn', label: 'Fade in' },
  { value: 'popIn', label: 'Pop in' },
  { value: 'slideUp', label: 'Slide up' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'pulseSlow', label: 'Pulse' },
  { value: 'move', label: 'Move' },
  { value: 'pathDraw', label: 'Path draw' },
];

export const generateAnimationId = () => generateShortId('anim');

export interface AnimationContributionSnapshot {
  elements: CanvasElement[];
  animations: SVGAnimation[];
}

/**
 * Check if an element has its own transform (transformMatrix or legacy transform object).
 * Elements with transforms need special handling for animations that depend on center point.
 */
export const elementHasTransform = (element: CanvasElement): boolean => {
  const data = element.data as Record<string, unknown>;

  // Check for transformMatrix
  if (Array.isArray(data.transformMatrix)) {
    const matrix = data.transformMatrix as number[];
    // Check if it's not an identity matrix
    const isIdentity = matrix[0] === 1 && matrix[1] === 0 &&
      matrix[2] === 0 && matrix[3] === 1 &&
      matrix[4] === 0 && matrix[5] === 0;
    if (!isIdentity) return true;
  }

  // Check for legacy transform object
  if (data.transform && typeof data.transform === 'object') {
    const t = data.transform as {
      translateX?: number; translateY?: number;
      rotation?: number; scaleX?: number; scaleY?: number
    };
    // Check if any transform property is non-default
    if ((t.rotation && t.rotation !== 0) ||
      (t.scaleX !== undefined && t.scaleX !== 1) ||
      (t.scaleY !== undefined && t.scaleY !== 1)) {
      return true;
    }
  }

  return false;
};

export const DEF_CONTAINER_TAGS = new Set([
  'lineargradient',
  'radialgradient',
  'pattern',
  'mask',
  'marker',
  'filter',
  'clippath',
  'symbol',
]);

export const matchesAnimationTarget = (animation: SVGAnimation, candidateId: string): boolean => {
  return (
    animation.targetElementId === candidateId ||
    animation.previewElementId === candidateId ||
    animation.clipPathTargetId === candidateId ||
    animation.gradientTargetId === candidateId ||
    animation.patternTargetId === candidateId ||
    animation.maskTargetId === candidateId ||
    animation.filterTargetId === candidateId ||
    animation.markerTargetId === candidateId
  );
};

/**
 * Matches animations that target a def element directly (not its children).
 * These are animations like animateTransform on gradientTransform or patternTransform.
 */
export const matchesDefElementTarget = (animation: SVGAnimation, defId: string, tagName: string): boolean => {
  // Gradient-level animations (not on stops)
  if ((tagName === 'lineargradient' || tagName === 'radialgradient') &&
    animation.gradientTargetId === defId &&
    animation.stopIndex === undefined) {
    return true;
  }
  // Pattern-level animations (not on children)
  if (tagName === 'pattern' &&
    animation.patternTargetId === defId &&
    animation.patternChildIndex === undefined) {
    return true;
  }
  // Marker-level animations (not on children)
  if (tagName === 'marker' &&
    animation.markerTargetId === defId &&
    animation.markerChildIndex === undefined) {
    return true;
  }
  // ClipPath-level animations (not on children)
  if (tagName === 'clippath' &&
    animation.clipPathTargetId === defId &&
    animation.clipPathChildIndex === undefined) {
    return true;
  }
  // Mask-level animations (not on children)
  if (tagName === 'mask' &&
    animation.maskTargetId === defId &&
    animation.maskChildIndex === undefined) {
    return true;
  }
  // Filter-level animations (not on primitives)
  if (tagName === 'filter' &&
    animation.filterTargetId === defId &&
    animation.filterPrimitiveIndex === undefined) {
    return true;
  }
  return false;
};

/**
 * Matches animations that target a specific defs child element.
 * Defs children are identified by the owner ID + child index.
 */
export const matchesDefsChildTarget = (
  animation: SVGAnimation,
  defsOwnerId: string,
  childIndex: number,
  tagName: string
): boolean => {
  // Check for gradient stop animations
  if (tagName === 'stop' && animation.gradientTargetId === defsOwnerId && animation.stopIndex === childIndex) {
    return true;
  }
  // Check for pattern child animations (paths, shapes inside patterns)
  if (animation.patternTargetId === defsOwnerId && animation.patternChildIndex === childIndex) {
    return true;
  }
  // Check for symbol child animations
  if (animation.symbolTargetId === defsOwnerId && animation.symbolChildIndex === childIndex) {
    return true;
  }
  // Check for filter primitive animations
  if (animation.filterTargetId === defsOwnerId && animation.filterPrimitiveIndex === childIndex) {
    return true;
  }
  // Check for marker child animations (paths, shapes inside markers)
  if (animation.markerTargetId === defsOwnerId && animation.markerChildIndex === childIndex) {
    return true;
  }
  // Check for clipPath child animations (rects, paths, shapes inside clipPaths)
  if (animation.clipPathTargetId === defsOwnerId && animation.clipPathChildIndex === childIndex) {
    return true;
  }
  // Check for mask child animations (rects, circles, paths inside masks)
  if (animation.maskTargetId === defsOwnerId && animation.maskChildIndex === childIndex) {
    return true;
  }
  return false;
};

/**
 * Detects the defs type based on the owner ID pattern and tag name.
 */
export const detectDefsType = (defsOwnerId: string, tagName: string): 'gradient' | 'pattern' | 'symbol' | 'filter' | 'mask' | 'marker' | 'clipPath' | null => {
  if (tagName === 'stop') return 'gradient';
  // Gradient detection
  if (defsOwnerId.includes('grad') || defsOwnerId.startsWith('linear-') || defsOwnerId.startsWith('radial-') || defsOwnerId.startsWith('g_')) return 'gradient';
  // Symbol detection
  if (defsOwnerId.startsWith('symbol-') || defsOwnerId.startsWith('symbol') || defsOwnerId.includes('symbol')) return 'symbol';
  // Filter detection
  if (defsOwnerId.startsWith('filter-') || defsOwnerId.startsWith('filter') || defsOwnerId.startsWith('f_')) return 'filter';
  // Mask detection
  if (defsOwnerId.startsWith('mask-') || defsOwnerId.startsWith('mask') || defsOwnerId.startsWith('m_')) return 'mask';
  // Marker detection
  if (defsOwnerId.startsWith('marker-') || defsOwnerId.startsWith('marker') || defsOwnerId.startsWith('mk_')) return 'marker';
  // ClipPath detection
  if (defsOwnerId.startsWith('clipPath-') || defsOwnerId.startsWith('clip') || defsOwnerId.startsWith('cp_')) return 'clipPath';
  // Pattern detection
  if (defsOwnerId.startsWith('pat_') || defsOwnerId.startsWith('pattern')) return 'pattern';
  // Default to pattern for unknown defs
  return 'pattern';
};

export const getContributionTargetId = (node: SvgStructureContributionProps<CanvasStore>['node']): string | null => {
  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(
    node.isDefs &&
    node.defsOwnerId &&
    node.childIndex !== undefined &&
    !isDefContainerTag
  );

  if (isDefsChild) {
    return node.defsOwnerId ?? null;
  }

  return node.dataElementId ?? node.idAttribute ?? null;
};

export const buildContributionElementMap = (elements: CanvasElement[]): Map<string, CanvasElement> => (
  new Map(elements.map((element) => [element.id, element]))
);

export const collectElementTargetsFromMap = (
  element: CanvasElement | undefined,
  elementMap: Map<string, CanvasElement>,
  acc: Set<string>
): void => {
  if (!element) return;
  if (acc.has(element.id)) return;
  acc.add(element.id);

  const referenced = getReferencedIds(element) ?? [];
  referenced.forEach((id) => acc.add(id));

  if (element.type === 'group') {
    const childIds = ((element as GroupElement).data.childIds ?? []) as string[];
    childIds.forEach((childId) => {
      collectElementTargetsFromMap(elementMap.get(childId), elementMap, acc);
    });
  }
};

export const getTargetIdsForNode = (
  node: SvgStructureContributionProps<CanvasStore>['node'],
  elementMap: Map<string, CanvasElement>
): Set<string> => {
  const targetId = getContributionTargetId(node);
  const ids = new Set<string>();

  if (!targetId) {
    return ids;
  }

  const base = elementMap.get(targetId);
  if (base) {
    collectElementTargetsFromMap(base, elementMap, ids);
  } else {
    ids.add(targetId);
  }

  return ids;
};

export const getMatchingAnimationsForNode = (
  node: SvgStructureContributionProps<CanvasStore>['node'],
  elements: CanvasElement[],
  animations: SVGAnimation[]
): SVGAnimation[] => {
  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(
    node.isDefs &&
    node.defsOwnerId &&
    node.childIndex !== undefined &&
    !isDefContainerTag
  );
  const targetId = getContributionTargetId(node);
  if (!targetId) {
    return [];
  }

  if (isDefsChild && node.defsOwnerId && node.childIndex !== undefined) {
    return animations.filter((anim) =>
      matchesDefsChildTarget(anim, node.defsOwnerId as string, node.childIndex as number, node.tagName)
    );
  }

  const isDefElement = node.isDefs && node.idAttribute && isDefContainerTag;
  if (isDefElement && node.idAttribute) {
    return animations.filter((anim) =>
      matchesDefElementTarget(anim, node.idAttribute as string, node.tagName)
    );
  }

  const targetIds = Array.from(getTargetIdsForNode(node, buildContributionElementMap(elements)));
  return animations.filter((anim) => targetIds.some((id) => matchesAnimationTarget(anim, id)));
};

export const haveMatchingAnimationsChanged = (
  node: SvgStructureContributionProps<CanvasStore>['node'],
  previousValue: AnimationContributionSnapshot,
  nextValue: AnimationContributionSnapshot
): boolean => {
  const previousAnimations = getMatchingAnimationsForNode(
    node,
    previousValue.elements,
    previousValue.animations
  );
  const nextAnimations = getMatchingAnimationsForNode(
    node,
    nextValue.elements,
    nextValue.animations
  );

  if (previousAnimations.length !== nextAnimations.length) {
    return true;
  }

  return previousAnimations.some((animation, index) => animation !== nextAnimations[index]);
};

export const haveTrackedElementsChanged = (
  node: SvgStructureContributionProps<CanvasStore>['node'],
  previousElements: CanvasElement[],
  nextElements: CanvasElement[]
): boolean => {
  const previousElementMap = buildContributionElementMap(previousElements);
  const nextElementMap = buildContributionElementMap(nextElements);
  const trackedIds = getTargetIdsForNode(node, nextElementMap);

  if (trackedIds.size === 0) {
    return false;
  }

  for (const id of trackedIds) {
    if (previousElementMap.get(id) !== nextElementMap.get(id)) {
      return true;
    }
  }

  return false;
};

export const selectAnimationContributionSnapshot = (state: CanvasStore): AnimationContributionSnapshot => {
  const animationState = state as CanvasStore & AnimationPluginSlice;
  return {
    elements: state.elements,
    animations: animationState.animations ?? [],
  };
};
