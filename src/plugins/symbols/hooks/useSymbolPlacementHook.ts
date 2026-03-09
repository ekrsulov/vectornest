import { useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { SymbolPluginSlice } from '../slice';
import { getEffectiveShift } from '../../../utils/effectiveShift';
import {
  calculateAspectPlacementRect,
  createCenteredPlacementRect,
  isPlacementDragSufficient,
  snapPlacementTargetPoint,
} from '../../../utils/aspectPlacement';

type SymbolStore = CanvasStore & SymbolPluginSlice;

export const useSymbolPlacementHook = (context: PluginHooksContext): void => {
  const { svgRef, screenToCanvas } = context;
  useEffect(() => {
    const resetInteraction = () => {
      const state = useCanvasStore.getState() as SymbolStore;
      state.setSymbolPlacementInteraction?.({
        isActive: false,
        pointerId: null,
        startPoint: null,
        targetPoint: null,
        isShiftPressed: false,
      });
    };

    const cleanup = installGlobalPluginListeners(
      createListenerContext(useCanvasStore),
      [
        {
          target: () => svgRef.current ?? window,
          event: 'pointerdown',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            if (event.pointerType !== 'touch' && event.button !== 0) return;
            const state = useCanvasStore.getState() as SymbolStore;
            const symbolId = state.placingSymbolId;
            if (!symbolId) return;
            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;
            const symbol = state.symbols.find((s) => s.id === symbolId);
            if (!symbol) return;
            event.preventDefault();
            event.stopPropagation();
            const point = screenToCanvas(event.clientX, event.clientY);
            const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
            state.setSymbolPlacementInteraction?.({
              isActive: true,
              pointerId: event.pointerId,
              startPoint: point,
              targetPoint: point,
              sourceWidth: symbol.bounds.width,
              sourceHeight: symbol.bounds.height,
              isShiftPressed: effectiveShiftKey,
            });
          },
        },
        {
          target: () => window,
          event: 'pointermove',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as SymbolStore;
            const interaction = state.symbolPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId || !interaction.startPoint) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
            const rawTargetPoint = screenToCanvas(event.clientX, event.clientY);
            const targetPoint = snapPlacementTargetPoint(
              interaction.startPoint,
              rawTargetPoint,
              effectiveShiftKey,
            );

            state.setSymbolPlacementInteraction?.({
              targetPoint,
              isShiftPressed: effectiveShiftKey,
            });
          },
        },
        {
          target: () => window,
          event: 'pointerup',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as SymbolStore;
            const interaction = state.symbolPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId || !interaction.startPoint) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            const symbolId = state.placingSymbolId;
            if (!symbolId) {
              resetInteraction();
              return;
            }

            const sourceSize = {
              width: interaction.sourceWidth,
              height: interaction.sourceHeight,
            };
            const placementRect = interaction.targetPoint && isPlacementDragSufficient(
              interaction.startPoint,
              interaction.targetPoint,
            )
              ? calculateAspectPlacementRect(interaction.startPoint, interaction.targetPoint, sourceSize)
              : createCenteredPlacementRect(interaction.startPoint, sourceSize);

            state.placeSymbolInstanceAtRect?.(symbolId, placementRect);
            resetInteraction();
          },
        },
        {
          target: () => window,
          event: 'pointercancel',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as SymbolStore;
            const interaction = state.symbolPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            resetInteraction();
          },
        },
      ]
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const state = useCanvasStore.getState() as SymbolStore;
      if (state.placingSymbolId) {
        state.setPlacingSymbolId?.(null);
        resetInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [svgRef, screenToCanvas]);
};
