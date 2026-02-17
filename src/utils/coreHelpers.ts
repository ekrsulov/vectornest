/**
 * Core Helper Utilities
 * 
 * Centralized micro-helpers to eliminate DRY violations across the codebase.
 * These utilities are used for common operations like formatting and collection merging.
 */

/**
 * Clamp a numeric value between a minimum and maximum range.
 * 
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value within [min, max]
 * 
 * @example
 * clamp(15, 0, 10) // 10
 * clamp(-5, 0, 10) // 0
 * clamp(5, 0, 10) // 5
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a decimal number as a percentage string.
 * 
 * @param value - Decimal value (0.0 to 1.0)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75%" or "75.5%")
 * 
 * @example
 * formatPercent(0.75) // "75%"
 * formatPercent(0.755, 1) // "75.5%"
 */
export function formatPercent(value: number, decimals: number = 0): string {
  const percent = value * 100;
  return decimals > 0 
    ? `${percent.toFixed(decimals)}%` 
    : `${Math.round(percent)}%`;
}

/**
 * Merge items into a collection, removing duplicates based on a key selector.
 * Items from the items array take precedence over existing collection items.
 * 
 * @param collection - Existing collection
 * @param items - Items to merge into collection
 * @param keySelector - Function to extract unique key from item
 * @returns New array with merged unique items
 * 
 * @example
 * const merged = mergeUniqueByKey(
 *   existingItems,
 *   newItems,
 *   item => `${item.elementId}-${item.index}`
 * );
 */
export function mergeUniqueByKey<T>(
  collection: T[],
  items: T[],
  keySelector: (item: T) => string
): T[] {
  const keyMap = new Map<string, T>();
  
  // Add existing items
  collection.forEach(item => {
    const key = keySelector(item);
    keyMap.set(key, item);
  });
  
  // Merge new items (overwrite existing)
  items.forEach(item => {
    const key = keySelector(item);
    keyMap.set(key, item);
  });
  
  return Array.from(keyMap.values());
}

/**
 * Create a factory for shallow comparison functions.
 * Useful for React.memo comparators that compare multiple props.
 * 
 * @param keys - Array of prop keys to compare
 * @returns Comparison function that returns true if props are equal
 * 
 * @example
 * const arePropsEqual = makeShallowComparator<MyProps>(['id', 'isSelected', 'isHidden']);
 * export const MyComponent = memo(MyComponentImpl, arePropsEqual);
 */
export function makeShallowComparator<P extends Record<string, unknown>>(
  keys: (keyof P)[]
): (prevProps: P, nextProps: P) => boolean {
  return (prevProps: P, nextProps: P): boolean => {
    for (const key of keys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
}
