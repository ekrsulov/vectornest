import { useState, useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../utils/pluginListeners';
import { useCanvasStore } from '../../store/canvasStore';

export interface CanvasSize {
  width: number;
  height: number;
}

interface UseDynamicCanvasSizeOptions {
  /**
   * Optional window provider for testing purposes.
   * Defaults to the global window object.
   */
  windowProvider?: Window & typeof globalThis;
}

/**
 * Hook that manages dynamic canvas size that updates with viewport changes.
 * Handles Safari toolbar show/hide and other viewport changes.
 * 
 * @param options - Optional configuration
 * @returns Current canvas size
 */
export function useDynamicCanvasSize(
  options?: UseDynamicCanvasSizeOptions
): CanvasSize {
  const win = options?.windowProvider ?? window;

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: win.innerWidth,
    height: win.innerHeight,
  });

  useEffect(() => {
    const updateCanvasSize = () => {
      // Use visualViewport if available (better for mobile Safari)
      const width = win.visualViewport?.width ?? win.innerWidth;
      const height = win.visualViewport?.height ?? win.innerHeight;
      setCanvasSize({ width, height });
    };

    // Listen to both resize and visualViewport changes using centralized listener helper
    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => win, event: 'resize', handler: () => updateCanvasSize() },
      { target: () => win.visualViewport ?? null, event: 'resize', handler: () => updateCanvasSize() },
      { target: () => win.visualViewport ?? null, event: 'scroll', handler: () => updateCanvasSize() },
    ]);

    return cleanup;
  }, [win]);

  return canvasSize;
}
