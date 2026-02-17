import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CanvasStore } from '../store/canvasStore';
import { canvasStoreApi } from '../store/canvasStore';

export interface ToggleFlag {
  id: string;
  pluginId: string;
  label: string;
  group?: string;
  icon?: React.ComponentType<{ size?: number }>;
  isActive: (state: CanvasStore) => boolean;
  toggle: (state: CanvasStore) => void;
}

export interface ToggleFlagEntry {
  config: ToggleFlag;
  isActive: boolean;
  toggle: () => void;
}

const toggleFlags = new Map<string, ToggleFlag>();
const listeners = new Set<() => void>();
const snapshotCache = new Map<string, ToggleFlag[]>();

const cacheKey = (group?: string) => group ?? '__all__';

const notify = () => {
  snapshotCache.clear();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[toggleFlagRegistry] Listener failed', error);
    }
  });
};

export function registerToggleFlag(flag: ToggleFlag): void {
  toggleFlags.set(flag.id, flag);
  notify();
}

export function unregisterToggleFlag(flagId: string): void {
  if (toggleFlags.delete(flagId)) {
    notify();
  }
}

export function getToggleFlagsSnapshot(group?: string): ToggleFlag[] {
  const key = cacheKey(group);
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const values = Array.from(toggleFlags.values());
  const filtered = group ? values.filter((flag) => flag.group === group) : values;
  snapshotCache.set(key, filtered);
  return filtered;
}

export function subscribeToggleFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const safeExecute = <T>(flagId: string, fn: () => T): T | undefined => {
  try {
    return fn();
  } catch (error) {
    console.warn(`Toggle flag "${flagId}" failed`, error);
    return undefined;
  }
};

export function useToggleFlags(group?: string): ToggleFlagEntry[] {
  const computeEntries = useCallback((): ToggleFlagEntry[] => {
    const state = canvasStoreApi.getState() as CanvasStore;
    const defs = getToggleFlagsSnapshot(group);
    return defs.map((flag) => {
      const isActive = safeExecute(flag.id, () => flag.isActive(state)) ?? false;
      const toggle = () => {
        const latestState = canvasStoreApi.getState() as CanvasStore;
        safeExecute(flag.id, () => flag.toggle(latestState));
      };
      return { config: flag, isActive, toggle };
    });
  }, [group]);

  const [entries, setEntries] = useState<ToggleFlagEntry[]>(() => computeEntries());

  useEffect(() => {
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      const next = computeEntries();
      setEntries((prev) => {
        if (
          prev.length === next.length &&
          prev.every((entry, idx) => entry.config === next[idx].config && entry.isActive === next[idx].isActive)
        ) {
          return prev;
        }
        return next;
      });
    };

    const unsubscribeStore = canvasStoreApi.subscribe(update);
    const unsubscribeRegistry = subscribeToggleFlags(update);

    return () => {
      mounted = false;
      unsubscribeStore();
      unsubscribeRegistry();
    };
  }, [computeEntries]);

  // Recompute when group changes even if store didn't notify yet
  useEffect(() => {
    setEntries(computeEntries());
  }, [computeEntries]);

  return entries;
}
