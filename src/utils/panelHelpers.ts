/**
 * Panel helper utilities for reducing boilerplate in panel components.
 * Provides factories for common patterns like property updaters and event handlers.
 */

/**
 * Creates a property updater function for a given update function.
 * Simplifies creating individual property setters.
 * 
 * @param updateFn - The update function that accepts partial state
 * @returns A function that creates property-specific updaters
 * 
 * @example
 * ```tsx
 * const updateTextState = useCanvasStore(state => state.updateTextState);
 * const updateProperty = createPropertyUpdater(updateTextState);
 * 
 * // Instead of:
 * const handleFontSizeChange = (value: number) => {
 *   updateTextState?.({ fontSize: value });
 * };
 * 
 * // Use:
 * const handleFontSizeChange = updateProperty('fontSize');
 * ```
 */
export function createPropertyUpdater<T extends Record<string, unknown>>(
  updateFn: ((updates: Partial<T>) => void) | undefined
) {
  return <K extends keyof T>(key: K) => {
    return (value: T[K]) => {
      if (updateFn) {
        updateFn({ [key]: value } as unknown as Partial<T>);
      }
    };
  };
}

/**
 * Creates an object with getter functions for accessing state properties with defaults.
 * Reduces boilerplate of multiple getCurrentX() functions.
 * 
 * @param state - The state object
 * @param defaults - Default values for properties
 * @returns Object with getter functions
 * 
 * @example
 * ```tsx
 * const text = useCanvasStore(state => state.text);
 * const current = createPropertyGetters(text, {
 *   fontSize: 16,
 *   fontFamily: 'Arial',
 *   text: ''
 * });
 * 
 * // Instead of:
 * const getCurrentFontSize = () => text?.fontSize ?? 16;
 * 
 * // Use:
 * <Input value={current.fontSize} />
 * ```
 */
export function createPropertyGetters<T extends Record<string, unknown>>(
  state: T | undefined | null,
  defaults: Partial<T>
): T {
  const result = {} as T;
  
  for (const key in defaults) {
    const value = state?.[key] ?? defaults[key];
    result[key] = value as T[Extract<keyof T, string>];
  }
  
  return result;
}

/**
 * Event handler that prevents spacebar propagation.
 * Useful for text inputs to prevent triggering canvas shortcuts.
 * 
 * @param e - Keyboard event
 * 
 * @example
 * ```tsx
 * <Input onKeyDown={preventSpacebarPropagation} />
 * ```
 */
export function preventSpacebarPropagation(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
): void {
  if (e.code === 'Space') {
    e.stopPropagation();
  }
}
