import type { CanvasElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { registerCleanupHook, unregisterCleanupHook } from '../../store/cleanupHookRegistry';

type AnimationStore = CanvasStore & {
  animations?: Array<Record<string, unknown>>;
  animationSync?: unknown;
  animationState?: unknown;
};

const extractPaintId = (paint: unknown): string | undefined => {
  if (typeof paint !== 'string') return undefined;
  const match = paint.match(/url\(#([^)]+)\)/);
  return match ? match[1] : undefined;
};

const animationCleanupHook = (
  deletedElementIds: string[],
  remainingElements: CanvasElement[],
  state: CanvasStore
): Partial<CanvasStore> => {
  const animationState = state as AnimationStore;

  type UnknownAnimation = {
    id?: unknown;
    targetElementId?: string;
    gradientTargetId?: string;
    patternTargetId?: string;
    filterTargetId?: string;
    clipPathTargetId?: string;
    maskTargetId?: string;
    markerTargetId?: string;
    attributeName?: string;
  };

  const animations = (animationState.animations as UnknownAnimation[]) ?? [];

  if (!Array.isArray(animations) || animations.length === 0) {
    return {};
  }

  const removedIds = new Set(deletedElementIds);
  const paintIds = new Set<string>();
  const filterIds = new Set<string>();
  const clipPathIds = new Set<string>();
  const maskIds = new Set<string>();
  const markerIds = new Set<string>();

  for (const el of remainingElements) {
    const data = el.data as Record<string, unknown>;
    const fillId = extractPaintId(data.fillColor);
    const strokeId = extractPaintId(data.strokeColor);
    if (fillId) paintIds.add(fillId);
    if (strokeId) paintIds.add(strokeId);

    const filterId = data.filterId as string | undefined;
    if (filterId) filterIds.add(filterId);

    const clipId =
      (data.clipPathTemplateId as string | undefined) ?? (data.clipPathId as string | undefined);
    if (clipId) clipPathIds.add(clipId);

    const maskId = data.maskId as string | undefined;
    if (maskId) maskIds.add(maskId);

    const markerStart = data.markerStart as string | undefined;
    const markerMid = data.markerMid as string | undefined;
    const markerEnd = data.markerEnd as string | undefined;
    if (markerStart) markerIds.add(markerStart);
    if (markerMid) markerIds.add(markerMid);
    if (markerEnd) markerIds.add(markerEnd);
  }

  const removedAnimationIds = new Set<string>();
  const keptAnimations = animations.filter((anim) => {
    const targetElementId = anim.targetElementId;
    if (targetElementId && removedIds.has(targetElementId)) {
      removedAnimationIds.add(String(anim.id ?? targetElementId));
      return false;
    }

    const gradientTargetId = anim.gradientTargetId;
    if (gradientTargetId && !paintIds.has(String(gradientTargetId))) {
      removedAnimationIds.add(String(anim.id ?? gradientTargetId));
      return false;
    }

    const patternTargetId = anim.patternTargetId;
    if (patternTargetId && !paintIds.has(String(patternTargetId))) {
      removedAnimationIds.add(String(anim.id ?? patternTargetId));
      return false;
    }

    const filterTargetId = anim.filterTargetId;
    if (filterTargetId && !filterIds.has(String(filterTargetId))) {
      removedAnimationIds.add(String(anim.id ?? filterTargetId));
      return false;
    }

    const clipTargetId = anim.clipPathTargetId;
    if (clipTargetId && !clipPathIds.has(clipTargetId)) {
      removedAnimationIds.add(String(anim.id ?? clipTargetId));
      return false;
    }

    const maskTargetId = anim.maskTargetId;
    if (maskTargetId && !maskIds.has(maskTargetId)) {
      removedAnimationIds.add(String(anim.id ?? maskTargetId));
      return false;
    }

    const markerTargetId = anim.markerTargetId;
    if (markerTargetId && !markerIds.has(markerTargetId)) {
      removedAnimationIds.add(String(anim.id ?? markerTargetId));
      return false;
    }

    return true;
  });

  if (removedAnimationIds.size === 0) {
    return {};
  }

  const cleanupResult: Partial<CanvasStore> = {
    animations: keptAnimations,
  };

  const animationSync = animationState.animationSync as {
    chains?: Array<{ animations: Array<{ animationId: string }> }>;
    events?: Array<{ sourceAnimationId?: string }>;
  } | undefined;

  if (animationSync) {
    const cleanedChains = (animationSync.chains ?? [])
      .map((chain) => ({
        ...chain,
        animations: chain.animations.filter(
          (entry) => !removedAnimationIds.has(entry.animationId)
        ),
      }))
      .filter((chain) => chain.animations.length > 0);

    const cleanedEvents = (animationSync.events ?? []).filter(
      (event) => !removedAnimationIds.has(event.sourceAnimationId ?? '')
    );

    cleanupResult.animationSync = {
      ...animationSync,
      chains: cleanedChains,
      events: cleanedEvents,
    };
  }

  const rawAnimationState = animationState.animationState as unknown;
  if (rawAnimationState && typeof rawAnimationState === 'object') {
    const animationStateData = rawAnimationState as {
      chainDelays?: Map<string, number> | Record<string, number | string>;
    };
    const delays =
      animationStateData.chainDelays instanceof Map
        ? new Map(animationStateData.chainDelays)
        : animationStateData.chainDelays && typeof animationStateData.chainDelays === 'object'
          ? new Map(
            Object.entries(
              animationStateData.chainDelays as Record<string, number | string>
            ).map(([key, value]) => [key, typeof value === 'number' ? value : Number(value) || 0])
          )
          : new Map<string, number>();

    removedAnimationIds.forEach((id) => delays.delete(id));

    cleanupResult.animationState = {
      ...animationStateData,
      chainDelays: delays,
    };
  }

  return cleanupResult;
};

export const registerAnimationCleanupHook = (): void => {
  registerCleanupHook('animation-system', animationCleanupHook);
};

export const unregisterAnimationCleanupHook = (): void => {
  unregisterCleanupHook('animation-system');
};
