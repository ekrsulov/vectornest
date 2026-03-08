import { useEffect } from 'react';
import type { CanvasStore } from '../../../store/canvasStore';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import type { IconifyLibrarySlice } from '../slice';

type IconifyPlacementStore = CanvasStore & IconifyLibrarySlice;

export const useIconifyPlacementHook = (context: PluginHooksContext): void => {
  const { svgRef, screenToCanvas } = context;

  useEffect(() => {
    const cleanup = installGlobalPluginListeners(
      createListenerContext(useCanvasStore),
      [
        {
          target: () => svgRef.current ?? window,
          event: 'pointerdown',
          handler: (event: PointerEvent) => {
            if (event.button !== 0) return;

            const state = useCanvasStore.getState() as IconifyPlacementStore;
            const placingIconId = state.iconifyLibrary.placingIconId;
            if (!placingIconId || state.iconifyLibrary.isPlacementPending) {
              return;
            }

            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;

            event.preventDefault();
            const point = screenToCanvas(event.clientX, event.clientY);
            void state.placeIconifyIcon(placingIconId, point);
          },
        },
      ],
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const state = useCanvasStore.getState() as IconifyPlacementStore;
      if (state.iconifyLibrary.placingIconId && !state.iconifyLibrary.isPlacementPending) {
        state.setIconifyPlacingIconId?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [svgRef, screenToCanvas]);
};
