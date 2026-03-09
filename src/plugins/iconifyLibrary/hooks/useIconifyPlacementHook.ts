import { useEffect } from 'react';
import type { CanvasStore } from '../../../store/canvasStore';
import { useCanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import { getEffectiveShift } from '../../../utils/effectiveShift';
import {
  calculateAspectPlacementRect,
  isPlacementDragSufficient,
  snapPlacementTargetPoint,
} from '../../../utils/aspectPlacement';
import {
  DEFAULT_INSERT_ICON_SIZE,
  getCachedIconifySvg,
  getIconifySvgBounds,
  loadIconifySvg,
  splitIconifyName,
} from '../iconifyApi';
import type { IconifyLibrarySlice } from '../slice';

type IconifyPlacementStore = CanvasStore & IconifyLibrarySlice;

const resolveCachedSourceSize = (iconId: string): { width: number; height: number } => {
  const cachedSvg = getCachedIconifySvg(iconId);
  const bounds = cachedSvg ? getIconifySvgBounds(cachedSvg) : null;
  if (bounds) {
    return {
      width: bounds.width,
      height: bounds.height,
    };
  }

  return {
    width: DEFAULT_INSERT_ICON_SIZE,
    height: DEFAULT_INSERT_ICON_SIZE,
  };
};

export const useIconifyPlacementHook = (context: PluginHooksContext): void => {
  const { svgRef, screenToCanvas } = context;

  useEffect(() => {
    const resetInteraction = () => {
      const state = useCanvasStore.getState() as IconifyPlacementStore;
      state.setIconifyPlacementInteraction?.({
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

            const state = useCanvasStore.getState() as IconifyPlacementStore;
            const placingIconId = state.iconifyLibrary.placingIconId;
            if (!placingIconId || state.iconifyLibrary.isPlacementPending) {
              return;
            }

            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;

            event.preventDefault();
            event.stopPropagation();

            const startPoint = screenToCanvas(event.clientX, event.clientY);
            const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);
            const cachedSourceSize = resolveCachedSourceSize(placingIconId);

            state.setIconifyPlacementInteraction?.({
              isActive: true,
              pointerId: event.pointerId,
              startPoint,
              targetPoint: startPoint,
              sourceWidth: cachedSourceSize.width,
              sourceHeight: cachedSourceSize.height,
              isShiftPressed: effectiveShiftKey,
            });

            const split = splitIconifyName(placingIconId);
            if (!split) {
              return;
            }

            const hasCachedSvg = Boolean(getCachedIconifySvg(placingIconId));
            if (hasCachedSvg) {
              return;
            }

            void loadIconifySvg(split.prefix, split.name)
              .then((rawSvg) => {
                const bounds = getIconifySvgBounds(rawSvg);
                if (!bounds) {
                  return;
                }

                const currentState = useCanvasStore.getState() as IconifyPlacementStore;
                const interaction = currentState.iconifyPlacementInteraction;
                if (
                  !interaction.isActive ||
                  interaction.pointerId !== event.pointerId ||
                  currentState.iconifyLibrary.placingIconId !== placingIconId
                ) {
                  return;
                }

                currentState.setIconifyPlacementInteraction?.({
                  sourceWidth: bounds.width,
                  sourceHeight: bounds.height,
                });
              })
              .catch(() => undefined);
          },
        },
        {
          target: () => window,
          event: 'pointermove',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as IconifyPlacementStore;
            const interaction = state.iconifyPlacementInteraction;
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

            state.setIconifyPlacementInteraction?.({
              targetPoint,
              isShiftPressed: effectiveShiftKey,
            });
          },
        },
        {
          target: () => window,
          event: 'pointerup',
          options: { capture: true },
          handler: async (event: PointerEvent) => {
            const state = useCanvasStore.getState() as IconifyPlacementStore;
            const interaction = state.iconifyPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId || !interaction.startPoint) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            const placingIconId = state.iconifyLibrary.placingIconId;
            if (!placingIconId) {
              resetInteraction();
              return;
            }

            if (!interaction.targetPoint || !isPlacementDragSufficient(interaction.startPoint, interaction.targetPoint)) {
              resetInteraction();
              await state.placeIconifyIcon(placingIconId, interaction.startPoint);
              return;
            }

            const split = splitIconifyName(placingIconId);
            let sourceSize = {
              width: interaction.sourceWidth,
              height: interaction.sourceHeight,
            };

            if (split) {
              try {
                const rawSvg = await loadIconifySvg(split.prefix, split.name);
                const bounds = getIconifySvgBounds(rawSvg);
                if (bounds) {
                  sourceSize = {
                    width: bounds.width,
                    height: bounds.height,
                  };
                }
              } catch {
                // Keep the last known preview size and let the insertion path surface the error if needed.
              }
            }

            const rect = calculateAspectPlacementRect(
              interaction.startPoint,
              interaction.targetPoint,
              sourceSize,
            );

            resetInteraction();
            await state.placeIconifyIconAtRect?.(placingIconId, rect);
          },
        },
        {
          target: () => window,
          event: 'pointercancel',
          options: { capture: true },
          handler: (event: PointerEvent) => {
            const state = useCanvasStore.getState() as IconifyPlacementStore;
            const interaction = state.iconifyPlacementInteraction;
            if (!interaction.isActive || interaction.pointerId !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            resetInteraction();
          },
        },
      ],
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const state = useCanvasStore.getState() as IconifyPlacementStore;
      if (state.iconifyLibrary.placingIconId && !state.iconifyLibrary.isPlacementPending) {
        state.setIconifyPlacingIconId?.(null);
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
