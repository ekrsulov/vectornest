import { useRef, useEffect, useCallback } from 'react';

/**
 * useDebouncedCallback
 * 
 * Returns a stable debounced callback which delays invoking the given function
 * until `delay` milliseconds have passed without subsequent calls.
 * 
 * @param fn - The function to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns A debounced version of the function with stable identity
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback((query: string) => {
 *   performSearch(query);
 * }, 300);
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number
): (...args: TArgs) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // Keep fnRef in sync with the latest callback
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debounced = useCallback((...args: TArgs) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  return debounced;
}
