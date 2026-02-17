import { useState, useEffect, useCallback, useRef } from 'react';
import { LOCAL_STORAGE_DEBOUNCE_MS } from '../constants';
import { logger } from '../utils/logger';

/**
 * Hook for syncing state with localStorage.
 * Handles JSON serialization/deserialization automatically.
 * Uses debouncing to prevent excessive disk operations during rapid updates.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Failed to load "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  // Ref to track debounce timeout
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update localStorage when value changes with debouncing
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce localStorage writes
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        logger.warn(`Failed to save "${key}" to localStorage:`, error);
      }
    }, LOCAL_STORAGE_DEBOUNCE_MS);

    // Cleanup timeout on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, storedValue]);

  // Reset to initial value
  const reset = useCallback(() => {
    setStoredValue(initialValue);
  }, [initialValue]);

  return [storedValue, setStoredValue, reset];
}
