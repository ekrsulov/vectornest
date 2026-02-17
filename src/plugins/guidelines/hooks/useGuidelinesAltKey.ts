import { useEffect } from 'react';
import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import type { GuidelinesPluginSlice } from '../slice';

/**
 * Hook that listens for Alt key presses to enable hover measurements.
 * When Alt is pressed, the guidelines system enters a mode where
 * hovering over elements shows distance measurements to nearby elements.
 */
export function useGuidelinesAltKey(_context: PluginHooksContext): void {
  useEffect(() => {
    const getState = () => useCanvasStore.getState() as unknown as GuidelinesPluginSlice;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && !e.repeat) {
        getState().setAltPressed?.(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        getState().setAltPressed?.(false);
      }
    };

    // Also clear on blur (when window loses focus)
    const handleBlur = () => {
      getState().setAltPressed?.(false);
    };

    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { event: 'keydown', handler: handleKeyDown },
      { event: 'keyup', handler: handleKeyUp },
      { event: 'blur', handler: () => handleBlur() },
    ]);

    return cleanup;
  }, []);
}
