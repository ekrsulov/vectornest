import { useEffect } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../../utils/pluginListeners';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { PluginHooksContext } from '../../../types/plugins';
import type { TextPathLibrarySlice } from '../slice';
import { TEXT_PATH_PRESETS } from '../presets';
import { parsePathD } from '../../../utils/pathParserUtils';

const DEFAULT_SIZE = 200;

type TextPathLibraryStore = CanvasStore & TextPathLibrarySlice;

export const useTextPathPlacementHook = (context: PluginHooksContext): void => {
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
            const state = useCanvasStore.getState() as TextPathLibraryStore;
            const presetId = state.placingTextPathPresetId;
            if (!presetId) return;
            const svg = svgRef.current;
            if (svg && !svg.contains(event.target as Node)) return;

            const preset = TEXT_PATH_PRESETS.find((p) => p.id === presetId);
            if (!preset) return;

            event.preventDefault();

            const clickPoint = screenToCanvas(event.clientX, event.clientY);
            const size = DEFAULT_SIZE;
            const halfSize = size / 2;
            const offsetX = clickPoint.x - halfSize;
            const offsetY = clickPoint.y - halfSize;

            const pathD = preset.generatePath(size);
            const commands = parsePathD(pathD);

            const translated = commands.map((cmd) => {
              if (cmd.type === 'Z') return cmd;
              const moved = {
                ...cmd,
                position: { x: cmd.position.x + offsetX, y: cmd.position.y + offsetY },
              };
              if (cmd.type === 'C') {
                return {
                  ...moved,
                  controlPoint1: {
                    x: cmd.controlPoint1.x + offsetX,
                    y: cmd.controlPoint1.y + offsetY,
                  },
                  controlPoint2: {
                    x: cmd.controlPoint2.x + offsetX,
                    y: cmd.controlPoint2.y + offsetY,
                  },
                };
              }
              return moved;
            });

            const storeStyle = state.style;
            const fillColor =
              storeStyle?.fillColor === 'none' ? '#000000' : (storeStyle?.fillColor ?? '#000000');

            state.addElement({
              type: 'path',
              data: {
                subPaths: [translated],
                strokeColor: 'none',
                strokeWidth: 0,
                fillColor: 'none',
                fillOpacity: 0,
                strokeOpacity: 1,
                textPath: {
                  text: 'Text on path',
                  fontSize: 24,
                  fontFamily: 'Arial',
                  fontWeight: 'normal',
                  fontStyle: 'normal' as const,
                  textAnchor: preset.defaultTextAnchor,
                  startOffset: preset.defaultStartOffset,
                  fillColor,
                  fillOpacity: storeStyle?.fillOpacity ?? 1,
                  strokeColor: 'none',
                  strokeWidth: 0,
                  strokeOpacity: 1,
                  dominantBaseline: 'alphabetic' as const,
                },
              },
            });

            state.setPlacingTextPathPresetId?.(null);
            state.setActivePlugin('select');
          },
        },
      ]
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const state = useCanvasStore.getState() as TextPathLibraryStore;
      if (state.placingTextPathPresetId) {
        state.setPlacingTextPathPresetId?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [svgRef, screenToCanvas]);
};
