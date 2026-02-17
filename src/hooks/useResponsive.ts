import { useBreakpointValue } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

/**
 * Unified responsive hook for mobile/desktop detection.
 * Consolidates the repeated useBreakpointValue pattern across components.
 * 
 * @returns Object with isMobile, isDesktop, isLandscape, and canPinSidebar boolean flags
 */
export function useResponsive() {
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' }) ?? false;

  // Detect landscape orientation
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleChange = (e: MediaQueryListEvent) => setIsLandscape(e.matches);

    // Set initial value
    setIsLandscape(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Allow pinning on desktop OR on mobile in landscape orientation
  const canPinSidebar = !isMobile || isLandscape;

  return {
    isMobile,
    isDesktop: !isMobile,
    isLandscape,
    canPinSidebar,
  };
}
