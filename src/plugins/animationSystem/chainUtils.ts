import type { AnimationState } from './types';

export const ensureChainDelays = (chainDelays?: AnimationState['chainDelays']): Map<string, number> => {
  if (chainDelays instanceof Map) return chainDelays;
  if (!chainDelays || typeof chainDelays !== 'object') return new Map<string, number>();
  const entries: Array<[string, number]> = Object.entries(chainDelays as Record<string, number | string>).map(
    ([key, value]) => [
      key,
      typeof value === 'number' ? value : Number(value) || 0,
    ]
  );
  return new Map<string, number>(entries);
};
