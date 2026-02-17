import { useEffect, useRef } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { DEFAULT_STROKE_COLOR_DARK, DEFAULT_STROKE_COLOR_LIGHT } from '../utils/defaultColors';
import type { PathData } from '../types';
import { pluginManager } from '../utils/pluginManager';
import { isMonoColor, transformMonoColor } from '../utils/colorModeSyncUtils';

/**
 * Hook that handles color mode changes and updates element colors accordingly.
 * Transforms black/white colors when switching between light and dark modes.
 */
export function useColorModeSync() {
  const { colorMode } = useColorMode();
  const previousColorMode = useRef<'light' | 'dark'>(colorMode as 'light' | 'dark');

  useEffect(() => {
    const prevMode = previousColorMode.current;
    const nextMode = colorMode as 'light' | 'dark';
    previousColorMode.current = nextMode;

    const targetStrokeColor = nextMode === 'dark'
      ? DEFAULT_STROKE_COLOR_DARK
      : DEFAULT_STROKE_COLOR_LIGHT;
    const state = useCanvasStore.getState();
    const currentDefault = state.settings.defaultStrokeColor;

    if (currentDefault === targetStrokeColor) {
      return;
    }

    // Update defaults + path colors in a single store update to avoid N updateElement calls.
    const oldDefaultColor = nextMode === 'dark' ? DEFAULT_STROKE_COLOR_LIGHT : DEFAULT_STROKE_COLOR_DARK;
    const transformColor = (color: string): string => transformMonoColor(color, nextMode);
    useCanvasStore.setState((currentState) => {
      let didUpdateElements = false;
      const nextElements = currentState.elements.map((element) => {
        if (element.type !== 'path') {
          return element;
        }

        const pathData = element.data as PathData;
        const updates: Partial<PathData> = {};

        if (pathData.strokeColor === oldDefaultColor) {
          updates.strokeColor = targetStrokeColor;
        } else if (isMonoColor(pathData.strokeColor)) {
          updates.strokeColor = transformColor(pathData.strokeColor);
        }

        if (isMonoColor(pathData.fillColor)) {
          updates.fillColor = transformColor(pathData.fillColor);
        }

        if (Object.keys(updates).length === 0) {
          return element;
        }

        didUpdateElements = true;
        return {
          ...element,
          data: {
            ...pathData,
            ...updates,
          },
        };
      });

      return {
        settings: {
          ...currentState.settings,
          defaultStrokeColor: targetStrokeColor,
        },
        ...(currentState.style?.strokeColor === currentDefault ? {
          style: {
            ...currentState.style,
            strokeColor: targetStrokeColor,
          },
        } : {}),
        ...(didUpdateElements ? { elements: nextElements } : {}),
      };
    });

    pluginManager.notifyColorModeChange(prevMode, nextMode);
  }, [colorMode]);
}
