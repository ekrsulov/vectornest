import { useEffect } from 'react';
import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import type { GuidelinesPluginSlice } from '../slice';

/**
 * Hook that tracks which element is under the cursor when Alt is pressed.
 * Used for showing distance measurements between elements on hover.
 */
export function useGuidelinesHoverElement(context: PluginHooksContext): void {
  useEffect(() => {
    const svgElement = context.svgRef.current;
    if (!svgElement) return;

    const handlePointerMove = (e: PointerEvent) => {
      const state = useCanvasStore.getState() as unknown as GuidelinesPluginSlice;
      const isAltPressed = state.guidelines?.isAltPressed;

      if (!isAltPressed) {
        if (state.guidelines?.hoveredElementId) {
          state.setHoveredElement?.(null);
        }
        return;
      }

      // Find element under cursor
      const target = e.target as SVGElement;
      const elementId = target?.getAttribute?.('data-element-id') || target?.closest?.('[data-element-id]')?.getAttribute('data-element-id');

      if (elementId !== state.guidelines?.hoveredElementId) {
        state.setHoveredElement?.(elementId || null);
      }
    };

    const handlePointerLeave = () => {
      const state = useCanvasStore.getState() as unknown as GuidelinesPluginSlice;
      if (state.guidelines?.hoveredElementId) {
        state.setHoveredElement?.(null);
      }
    };

    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => svgElement, event: 'pointermove', handler: handlePointerMove },
      { target: () => svgElement, event: 'pointerleave', handler: () => handlePointerLeave() },
    ]);

    return cleanup;
  }, [context.svgRef]);
}
