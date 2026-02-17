/**
 * Build a Map from element id to element for O(1) lookups.
 * This is a common pattern used throughout the codebase for efficient element access.
 * 
 * @param elements - Array of elements with an id property
 * @returns Map with element id as key and element as value
 */
export function buildElementMap<T extends { id: string }>(elements: T[]): Map<string, T> {
  return new Map(elements.map(el => [el.id, el]));
}
