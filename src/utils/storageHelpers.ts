/**
 * Helper to get a value from localStorage with JSON parsing and fallback.
 * Used for initializing Zustand state from persisted values.
 * 
 * @param key - The localStorage key to read from
 * @param defaultValue - Value to return if key doesn't exist or parsing fails
 * @returns The parsed value or defaultValue on any error
 */
export function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    // Silent fallback to default - common during SSR or when localStorage is corrupted
    // Safe fallback: use console.debug instead of importing logger to avoid circular initialization
    try { console.debug(`Failed to read "${key}" from localStorage, using default:`, error); } catch (_e) { /* ignore */ }
    return defaultValue;
  }
}
