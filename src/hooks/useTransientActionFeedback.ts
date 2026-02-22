import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Returns a temporary "active" state useful for button feedback like Applied/Cleared.
 * Calling trigger() enables the state and auto-resets it after the configured duration.
 */
export const useTransientActionFeedback = (durationMs = 2200): [boolean, () => void] => {
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setIsActive(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsActive(false);
      timerRef.current = null;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return [isActive, trigger];
};
