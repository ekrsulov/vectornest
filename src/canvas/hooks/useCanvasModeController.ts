import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import {
  getInitialCanvasMode,
  getCanvasModeDefinition,
  transitionCanvasMode,
  type CanvasMode,
  type CanvasModeStateConfig,
  type CanvasModeTransitionResult,
} from '../modes/CanvasModeMachine';

type CanvasModeTransitionExecutor = (mode: CanvasMode) => CanvasModeTransitionResult;

interface CanvasModeMachineHookResult {
  currentMode: CanvasMode;
  definition: CanvasModeStateConfig;
  transition: CanvasModeTransitionExecutor;
}

const normalizeMode = (mode: string | null | undefined): CanvasMode => {
  if (!mode) {
    return getInitialCanvasMode();
  }
  return mode as CanvasMode;
};

export const useCanvasModeController = (): CanvasModeMachineHookResult => {
  const activePlugin = useCanvasStore((state) => state.activePlugin);

  const currentMode = normalizeMode(activePlugin);

  const definition = useMemo(
    () => getCanvasModeDefinition(currentMode),
    [currentMode],
  );

  const transition = useCallback<CanvasModeTransitionExecutor>((mode) => {
    const store = useCanvasStore.getState();
    const current = normalizeMode(store.activePlugin);
    const result = transitionCanvasMode(current, mode);

    if (!result.changed) {
      return result;
    }

    useCanvasStore.setState({ activePlugin: result.mode });

    // Get global actions registered by plugins
    const globalActions = pluginManager.getGlobalTransitionActions();
    
    // Execute all actions: result.actions from mode config + global actions
    const allActions = [...result.actions, ...globalActions];
    
    for (const action of allActions) {
      // First try plugin manager's registered actions
      pluginManager.executeLifecycleAction(action);
      
      // Fallback for built-in actions on store
      switch (action) {
        case 'clearSubpathSelection':
          store.clearSubpathSelection?.();
          break;
        case 'clearSelectedCommands':
          store.clearSelectedCommands?.();
          break;
        default:
          break;
      }
    }

    return result;
  }, []);

  return {
    currentMode,
    definition,
    transition,
  };
};
