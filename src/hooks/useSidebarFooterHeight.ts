import { useEffect, useRef } from 'react';

/**
 * Hook to manage the CSS variable --sidebar-footer-height
 * Consolidates footer height management across panel and footer components
 * 
 * @param additionalOffset - Optional offset to add to the measured height (default: 0)
 * @returns Ref to attach to the element being measured
 * 
 * @example
 * ```tsx
 * const footerRef = useSidebarFooterHeight();
 * return <div ref={footerRef}>Footer content</div>;
 * ```
 * 
 * @example
 * ```tsx
 * // With additional offset (e.g., for padding)
 * const footerRef = useSidebarFooterHeight(80);
 * ```
 */
export function useSidebarFooterHeight(additionalOffset: number = 0) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) {
      return;
    }

    const updateHeightVariable = () => {
      const height = node.offsetHeight + additionalOffset;
      document.documentElement.style.setProperty('--sidebar-footer-height', `${height}px`);
    };

    updateHeightVariable();

    // Use ResizeObserver if available for dynamic updates
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.documentElement.style.removeProperty('--sidebar-footer-height');
      };
    }

    const resizeObserver = new ResizeObserver(updateHeightVariable);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--sidebar-footer-height');
    };
  }, [additionalOffset]);

  return elementRef;
}
