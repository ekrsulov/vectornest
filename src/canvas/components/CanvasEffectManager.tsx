import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { canvasStoreApi } from '../../store/canvasStore';
import { useCanvasFeedback, type SelectedCommand as CanvasFeedbackCommand } from '../hooks/useCanvasFeedback';
import { useCanvasExport } from '../hooks/useCanvasExport';
import type { CanvasEventBus } from '../CanvasEventBusContext';
import type { CanvasElement } from '../../types';
import { DEFAULT_MODE } from '../../constants';
import type { CanvasSize } from '../hooks/useDynamicCanvasSize';

interface CanvasEffectManagerProps {
  svgRef: RefObject<SVGSVGElement | null>;
  eventBus: CanvasEventBus;
  currentMode: string;
  transition: (mode: string) => void;
  animationIsPlaying: boolean;
  animationCurrentTime: number;
  animationRestartKey: number;
  setCanvasSize: (size: CanvasSize) => void;
  canvasSize: CanvasSize;
  selectedCommands: CanvasFeedbackCommand[];
  elements: CanvasElement[];
  saveAsPng: (selectedOnly: boolean) => void;
}

/**
 * Headless component for canvas side effects and subscriptions.
 */
export const CanvasEffectManager: React.FC<CanvasEffectManagerProps> = ({
  svgRef,
  eventBus,
  currentMode,
  transition,
  animationIsPlaying,
  animationCurrentTime,
  animationRestartKey,
  setCanvasSize,
  canvasSize,
  selectedCommands,
  elements,
  saveAsPng,
}) => {
  // Keep the main canvas SMIL timeline in sync with the animation controls.
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }

    if (animationIsPlaying) {
      svgEl.setCurrentTime?.(animationCurrentTime);
      svgEl.unpauseAnimations?.();
    } else {
      svgEl.pauseAnimations?.();
      svgEl.setCurrentTime?.(animationCurrentTime);
    }
  }, [animationIsPlaying, animationCurrentTime, animationRestartKey, svgRef]);

  // Use a ref for currentMode to avoid re-subscribing to event bus on every mode change
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('canvasDoubleClick', () => {
      const state = canvasStoreApi.getState();
      if (state.groupEditor.isEditing && state.groupEditor.activeGroupId) {
        state.exitGroupEditor();
      }

      if (currentModeRef.current !== DEFAULT_MODE) {
        transition(DEFAULT_MODE);
      }
    });

    return unsubscribe;
  }, [eventBus, transition]);

  useLayoutEffect(() => {
    setCanvasSize({ width: canvasSize.width, height: canvasSize.height });
  }, [setCanvasSize, canvasSize.width, canvasSize.height]);

  useCanvasFeedback({
    currentMode,
    selectedCommands,
    elements,
  });

  useCanvasExport({
    saveAsPng,
    svgRef,
  });

  return null;
};
