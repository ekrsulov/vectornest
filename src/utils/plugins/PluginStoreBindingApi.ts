import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type { PluginContextFull, PluginDefinition } from '../../types/plugins';
import {
  createPluginContextManager,
  type PluginContextManager,
} from './PluginContextManager';
import type { PluginRegistry } from './PluginRegistry';

export interface StoreBindingBootstrapDeps {
  pluginApis: Map<string, Record<string, (...args: unknown[]) => unknown>>;
  pluginCleanups: Map<string, () => void>;
  registry: PluginRegistry;
  applyPluginSlices: (plugin: PluginDefinition<CanvasStore>) => void;
  initializePluginApi: (plugin: PluginDefinition<CanvasStore>) => void;
  createPluginContext: (pluginId: string) => PluginContextFull<CanvasStore>;
  syncModePresentation: (activePluginId: string | null) => void;
  onContextManagerReady?: (contextManager: PluginContextManager) => void;
}

export function bootstrapStoreBinding(
  storeApi: CanvasStoreApi,
  deps: StoreBindingBootstrapDeps
): PluginContextManager {
  const contextManager = createPluginContextManager(storeApi, deps.pluginApis);
  contextManager.setPluginApis(deps.pluginApis);
  deps.onContextManagerReady?.(contextManager);

  Array.from(deps.registry.values()).forEach((plugin) => {
    if (plugin.slices?.length) {
      deps.applyPluginSlices(plugin);
    }

    deps.initializePluginApi(plugin);

    if (plugin.init && !deps.pluginCleanups.has(plugin.id)) {
      const context = deps.createPluginContext(plugin.id);
      const cleanup = plugin.init(context);
      if (cleanup) {
        deps.pluginCleanups.set(plugin.id, cleanup);
      }
    }
  });

  deps.syncModePresentation(storeApi.getState().activePlugin);

  return contextManager;
}

export function subscribeToStoreChanges(
  storeApi: CanvasStoreApi,
  deps: {
    onActivePluginChange: (previousPlugin: string | null, nextPlugin: string | null) => void;
    onElementDeleted: () => void;
  }
): () => void {
  return storeApi.subscribe((state, previousState) => {
    if (state.activePlugin !== previousState.activePlugin) {
      deps.onActivePluginChange(previousState.activePlugin, state.activePlugin);
    }

    if (state.elements.length < previousState.elements.length) {
      deps.onElementDeleted();
    }
  });
}
