/**
 * Debounce utility function
 * 
 * Creates a debounced version of a function that delays execution
 * until a specified delay has passed without subsequent calls.
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the function
 * 
 * @example
 * const debouncedSave = debounce((data) => saveToServer(data), 300);
 * debouncedSave(data1); // Will be cancelled
 * debouncedSave(data2); // Will execute after 300ms
 */
export type DebouncedFunction<T extends (...args: never[]) => void> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;

  const invoke = () => {
    if (!latestArgs) {
      timeoutId = null;
      return;
    }

    const argsToRun = latestArgs;
    latestArgs = null;
    timeoutId = null;
    func(...argsToRun);
  };

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      invoke();
    }, delay);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    latestArgs = null;
  };

  debounced.flush = () => {
    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    invoke();
  };

  return debounced;
}
