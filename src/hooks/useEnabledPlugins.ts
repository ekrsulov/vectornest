import { useRef, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { pluginManager } from '../utils/pluginManager';

/**
 * Hook to subscribe to enabled plugins state.
 * Centralizes the repeated pattern of subscribing to pluginSelector.enabledPlugins
 * across multiple components.
 *
 * Uses referential stability: the selector returns the raw value from the store,
 * then a useMemo stabilises the array reference when contents haven't changed.
 *
 * @returns Array of enabled plugin IDs, or empty array if all plugins are enabled
 */
export function useEnabledPlugins(): string[] {
  const prevRef = useRef<string[]>([]);

  const rawPlugins = useCanvasStore((state) => {
    const selectorState = (state as Record<string, unknown>).pluginSelector as { enabledPlugins?: string[] } | undefined;
    if (selectorState?.enabledPlugins && selectorState.enabledPlugins.length > 0) {
      return selectorState.enabledPlugins;
    }
    return null; // signal to compute fallback outside selector
  });

  return useMemo(() => {
    const next = rawPlugins ?? pluginManager.getAll().map((p) => p.id).filter((id) => pluginManager.isPluginEnabled(id));

    // Return previous reference if contents are identical to avoid re-renders
    const prev = prevRef.current;
    if (prev.length === next.length && prev.every((id, i) => id === next[i])) {
      return prev;
    }
    prevRef.current = next;
    return next;
  }, [rawPlugins]);
}
