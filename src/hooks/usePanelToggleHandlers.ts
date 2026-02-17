import { useCallback } from 'react';

/**
 * Generic hook for creating toggle handlers for panel components
 * Eliminates duplication between GridPanel, GuidelinesPanel, and other panels
 * Automatically handles undefined updaters by providing no-op handlers
 * 
 * @param updater - The store update function that accepts partial state (optional)
 * @returns Object with handler factory functions
 * 
 * @example
 * ```tsx
 * const { createToggleHandler } = usePanelToggleHandlers(updateGridState);
 * const handleToggleGrid = createToggleHandler('enabled');
 * const handleToggleSnap = createToggleHandler('snapEnabled');
 * ```
 */
export function usePanelToggleHandlers<T extends Record<string, unknown>>(
  updater?: (updates: Partial<T>) => void
) {
  /**
   * Creates a toggle handler for a specific boolean property
   */
  const createToggleHandler = useCallback(
    (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (updater) {
        updater({ [key]: e.target.checked } as Partial<T>);
      }
    },
    [updater]
  );

  return { createToggleHandler };
}
