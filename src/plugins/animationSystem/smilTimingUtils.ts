import { ensureChainDelays } from './chainUtils';
import type { AnimationState, SVGAnimation } from './types';

const EVENT_BASE_TOKEN = /^(\s*)([-\w:.]+)(\.[A-Za-z_][\w-]*(?:\(\d+\))?.*)$/;
const INDEFINITE_TOKEN = /^indefinite$/i;

export const buildSmilReferenceMap = (animations: SVGAnimation[]): Map<string, string> => {
  const idMap = new Map<string, string>();

  animations.forEach((animation) => {
    if (!animation.smilId) return;
    idMap.set(animation.smilId, animation.id);
  });

  return idMap;
};

export const getAnimationDomId = (animation: Pick<SVGAnimation, 'id' | 'smilId'>): string | undefined =>
  animation.smilId ? animation.id : undefined;

export const remapSmilTimingValue = (
  value: string | undefined,
  idMap: Map<string, string>
): string | undefined => {
  if (!value || !idMap.size) return value;

  return value
    .split(';')
    .map((segment) => {
      const match = segment.match(EVENT_BASE_TOKEN);
      if (!match) return segment;

      const [, whitespace, sourceId, suffix] = match;
      const remappedId = idMap.get(sourceId);
      if (!remappedId) return segment;

      return `${whitespace}${remappedId}${suffix}`;
    })
    .join(';');
};

export const resolveAnimationBegin = (
  animation: SVGAnimation,
  animationState: AnimationState | undefined,
  referenceAnimations: SVGAnimation[]
): string => {
  const remappedBegin = remapSmilTimingValue(
    animation.begin ?? '0s',
    buildSmilReferenceMap(referenceAnimations)
  );

  if (!animationState) {
    return remappedBegin ?? '0s';
  }

  const delays = ensureChainDelays(animationState.chainDelays);
  if (delays.has(animation.id)) {
    const delayMs = delays.get(animation.id) ?? 0;
    return `${(delayMs / 1000).toFixed(3)}s`;
  }

  return remappedBegin ?? '0s';
};

export const resolveAnimationEnd = (
  animation: SVGAnimation,
  referenceAnimations: SVGAnimation[]
): string | undefined =>
  remapSmilTimingValue(animation.end, buildSmilReferenceMap(referenceAnimations));

export const shouldTriggerBeginElementManually = (begin: string | null | undefined): boolean => {
  if (!begin) return false;

  return begin
    .split(';')
    .map((token) => token.trim())
    .some((token) => INDEFINITE_TOKEN.test(token));
};
