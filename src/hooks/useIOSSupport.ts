import { useMemo, useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../utils/pluginListeners';
import { useCanvasStore } from '../store/canvasStore';

// Type augmentation for navigator.userAgentData (not yet in all TS libs)
type NavigatorUA = Navigator & { userAgentData?: { platform?: string } };

/**
 * Hook that detects iOS devices and provides iOS-specific functionality.
 * Handles prevention of back swipe gesture from left edge.
 */
export function useIOSSupport() {
  // Detect iOS devices — prefer userAgentData.platform over deprecated navigator.platform
  const isIOS = useMemo(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (((navigator as NavigatorUA).userAgentData?.platform === 'macOS' || navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1),
    []);

  // Prevent iOS back swipe from left edge
  useEffect(() => {
    if (!isIOS) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < 20) {
        e.preventDefault();
      }
    };

    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => document, event: 'touchstart', handler: handleTouchStart, options: { passive: false } },
    ]);

    return cleanup;
  }, [isIOS]);

  return { isIOS };
}
