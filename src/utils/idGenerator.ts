const DEFAULT_REGISTRY_MAX_SIZE = 100_000;
const defaultRegistry = new Set<string>();
const defaultRegistryOrder: string[] = [];

const trackDefaultRegistryId = (id: string): void => {
  defaultRegistry.add(id);
  defaultRegistryOrder.push(id);

  if (defaultRegistryOrder.length <= DEFAULT_REGISTRY_MAX_SIZE) {
    return;
  }

  const staleId = defaultRegistryOrder.shift();
  if (staleId) {
    defaultRegistry.delete(staleId);
  }
};

const randomChunk = (length = 4): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, length);
};
const timeChunk = (): string => Date.now().toString(36).slice(-4);

export const generateShortId = (prefix: string, registry: Set<string> = defaultRegistry): string => {
  let candidate = `${prefix}-${timeChunk()}${randomChunk(3)}`;
  while (registry.has(candidate)) {
    candidate = `${prefix}-${timeChunk()}${randomChunk(4)}`;
  }

  if (registry === defaultRegistry) {
    trackDefaultRegistryId(candidate);
  } else {
    registry.add(candidate);
  }

  return candidate;
};

const syntheticAnimationPrefixes = ['ant-', 'imported-anim-target-', 'text-anim-target-'];

export const isSyntheticAnimationTargetId = (value: string): boolean => {
  return syntheticAnimationPrefixes.some((prefix) => value.startsWith(prefix));
};
