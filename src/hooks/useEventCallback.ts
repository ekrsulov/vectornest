import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A hook that returns a memoized callback which always has access to the latest state/props
 * without changing its reference identity.
 * 
 * This is useful for event handlers that need to access fresh state but shouldn't cause
 * re-subscriptions or re-renders in child components.
 * 
 * Pattern explanation:
 * - useRef stores the latest callback without triggering re-renders
 * - useLayoutEffect updates the ref synchronously after render but before paint
 * - The returned callback has stable identity but always calls the latest function
 * 
 * @example
 * const handleClick = useEventCallback((e: MouseEvent) => {
 *   // Always has access to latest `count` without causing re-subscriptions
 *   console.log(count);
 * });
 */
export function useEventCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T): T {
    const ref = useRef<T>(fn);

    // useLayoutEffect runs synchronously after render but before paint,
    // ensuring the ref is updated before any event handlers fire
    useLayoutEffect(() => {
        ref.current = fn;
    });

    // The callback identity is stable (empty deps), but it always invokes
    // the latest version of fn through the ref
    return useCallback((...args: Parameters<T>): ReturnType<T> => {
        return ref.current(...args);
    }, []) as T;
}
