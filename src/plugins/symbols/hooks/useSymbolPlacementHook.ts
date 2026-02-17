import { useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { SymbolPluginSlice } from '../slice';

type SymbolStore = CanvasStore & SymbolPluginSlice;

export const useSymbolPlacementHook = (context: PluginHooksContext): void => {
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
            const state = useCanvasStore.getState() as SymbolStore;
            const symbolId = state.placingSymbolId;
            if (!symbolId) return;
            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;
            const symbol = state.symbols.find((s) => s.id === symbolId);
            if (!symbol) return;
            event.preventDefault();
            const point = screenToCanvas(event.clientX, event.clientY);
            state.placeSymbolInstance?.(symbol.id, point);
          },
        },
      ]
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const state = useCanvasStore.getState() as SymbolStore;
      if (state.placingSymbolId) {
        state.setPlacingSymbolId?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [svgRef, screenToCanvas]);
};
