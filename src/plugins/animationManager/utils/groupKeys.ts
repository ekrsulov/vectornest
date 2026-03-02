import type { DiscoveredAnimationGroup } from '../types';

export function getAnimationMapGroupKey(
  elementId: string,
  group: DiscoveredAnimationGroup,
): string {
  return `${elementId}:${group.groupType}:${group.defId ?? 'direct'}`;
}
