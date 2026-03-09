import { useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { TextPathLibrarySlice } from '../slice';
import { TEXT_PATH_PRESETS } from '../presets';
import { getEffectiveShift } from '../../../utils/effectiveShift';
import {
  calculateAspectPlacementRect,
  createCenteredPlacementRect,
  isPlacementDragSufficient,
  snapPlacementTargetPoint,
} from '../../../utils/aspectPlacement';
import {
  createTextPathElementInput,
  getTextPathPresetSourceSize,
} from '../placement';

type TextPathLibraryStore = CanvasStore & TextPathLibrarySlice;

export const useTextPathPlacementHook = (context: PluginHooksContext): void => {
  const { svgRef, screenToCanvas } = context;

  useEffect(() => {
    const resetInteraction = () => {
      const state = useCanvasStore.getState() as TextPathLibraryStore;
      state.setTextPathPlacementInteraction?.({
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
            const state = useCanvasStore.getState() as TextPathLibraryStore;
            const presetId = state.placingTextPathPresetId;
            if (!presetId) return;
            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;

            const preset = TEXT_PATH_PRESETS.find((p) => p.id === presetId);
            if (!preset) return;

            event.preventDefault();
            event.stopPropagation();

            const startPoint = screenToCanvas(event.clientX, event.clientY);
            const sourceSize = getTextPathPresetSourceSize(preset);
            const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);

            state.setTextPathPlacementInteraction?.({
              isActive: true,
              pointerId: event.pointerId,
              startPoint,
              targetPoint: startPoint,
              sourceWidth: sourceSize.width,
              sourceHeight: sourceSize.height,
              isShiftPressed: effectiveShiftKey,
            });
          },
        },
        {
          target: () => window,
          event: 'pointermove',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as TextPathLibraryStore;
            const interaction = state.textPathPlacementInteraction;
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

            state.setTextPathPlacementInteraction?.({
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
            const state = useCanvasStore.getState() as TextPathLibraryStore;
            const interaction = state.textPathPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId || !interaction.startPoint) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            const presetId = state.placingTextPathPresetId;
            const preset = presetId
              ? TEXT_PATH_PRESETS.find((candidate) => candidate.id === presetId)
              : null;

            if (!preset || !interaction.targetPoint) {
              resetInteraction();
              return;
            }

            const sourceSize = {
              width: interaction.sourceWidth,
              height: interaction.sourceHeight,
            };
            const placementRect = isPlacementDragSufficient(
              interaction.startPoint,
              interaction.targetPoint,
            )
              ? calculateAspectPlacementRect(interaction.startPoint, interaction.targetPoint, sourceSize)
              : createCenteredPlacementRect(interaction.startPoint, sourceSize);

            state.addElement(
              createTextPathElementInput(preset, placementRect, state.style),
            );
            state.setPlacingTextPathPresetId?.(null);
            state.setActivePlugin('select');
            resetInteraction();
          },
        },
        {
          target: () => window,
          event: 'pointercancel',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as TextPathLibraryStore;
            const interaction = state.textPathPlacementInteraction;
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
      const state = useCanvasStore.getState() as TextPathLibraryStore;
      if (state.placingTextPathPresetId) {
        state.setPlacingTextPathPresetId?.(null);
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
