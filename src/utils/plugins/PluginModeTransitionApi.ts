import {
  getCanvasModeMachine,
  transitionCanvasMode,
  type CanvasMode,
} from '../../canvas/modes/CanvasModeMachine';
import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type { PluginRegistry } from './PluginRegistry';

export function syncModePresentation(
  storeApi: CanvasStoreApi,
  registry: PluginRegistry,
  activePluginId: string | null
): void {
  const pluginDef = activePluginId ? registry.get(activePluginId) : undefined;
  const isPathInteractionDisabled = pluginDef?.metadata.disablePathInteraction ?? false;
  const pathCursorMode = pluginDef?.metadata.pathCursorMode ?? 'default';
  const state = storeApi.getState();

  if (
    state.isPathInteractionDisabled === isPathInteractionDisabled &&
    state.pathCursorMode === pathCursorMode
  ) {
    return;
  }

  storeApi.setState({
    isPathInteractionDisabled,
    pathCursorMode,
  } as Partial<CanvasStore>);
}

export function executeBuiltInTransitionAction(
  storeApi: CanvasStoreApi,
  actionId: string
): void {
  const state = storeApi.getState() as CanvasStore & {
    clearSubpathSelection?: () => void;
    clearSelectedCommands?: () => void;
  };

  switch (actionId) {
    case 'clearSubpathSelection':
      state.clearSubpathSelection?.();
      break;
    case 'clearSelectedCommands':
      state.clearSelectedCommands?.();
      break;
    default:
      break;
  }
}

export function handleActivePluginChange(params: {
  previousPlugin: string | null;
  nextPlugin: string | null;
  storeApi: CanvasStoreApi;
  registry: PluginRegistry;
  executeLifecycleAction: (actionId: string) => void;
  getGlobalTransitionActions: () => string[];
}): void {
  const {
    previousPlugin,
    nextPlugin,
    storeApi,
    registry,
    executeLifecycleAction,
    getGlobalTransitionActions,
  } = params;

  syncModePresentation(storeApi, registry, nextPlugin);
  if (!nextPlugin) {
    return;
  }

  const currentMode = (previousPlugin ?? getCanvasModeMachine().initial) as CanvasMode;
  const targetMode = nextPlugin as CanvasMode;
  const transitionResult = transitionCanvasMode(currentMode, {
    type: 'ACTIVATE',
    value: targetMode,
  });

  if (!transitionResult.changed) {
    return;
  }

  executeLifecycleAction(`onModeEnter:${nextPlugin}`);

  const allActions = [...transitionResult.actions, ...getGlobalTransitionActions()];
  allActions.forEach((action) => {
    executeLifecycleAction(action);
    executeBuiltInTransitionAction(storeApi, action);
  });
}
