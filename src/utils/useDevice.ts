import { useEffect, useMemo, useState } from 'react';

export const MOBILE_VIEWPORT_QUERY = '(max-width: 48em)';

export function isMobileViewport(query: string = MOBILE_VIEWPORT_QUERY): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useDevice(query: string = MOBILE_VIEWPORT_QUERY): {
  isMobile: boolean;
  isDesktop: boolean;
} {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent): void => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return useMemo(
    () => ({
      isMobile,
      isDesktop: !isMobile,
    }),
    [isMobile]
  );
}
