import type { CanvasStore } from '../../store/canvasStore';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasEventBus } from '../../canvas/CanvasEventBusContext';
import type { PluginContextManager } from './PluginContextManager';
import type { PluginInteractionManager } from './PluginInteractionManager';

export function applyEventBusBinding(params: {
  eventBus: CanvasEventBus | null;
  interactionManager: PluginInteractionManager;
  contextManager: PluginContextManager | null;
  plugins: PluginDefinition<CanvasStore>[];
  isPluginEnabled: (pluginId: string) => boolean;
  getPluginApi: (pluginId: string) => Record<string, (...args: unknown[]) => unknown> | undefined;
}): void {
  const {
    eventBus,
    interactionManager,
    contextManager,
    plugins,
    isPluginEnabled,
    getPluginApi,
  } = params;

  interactionManager.setEventBus(eventBus);

  if (contextManager) {
    interactionManager.setContextManager(contextManager);
    contextManager.setEventBus(eventBus);
  }

  if (eventBus) {
    interactionManager.refreshInteractions(
      plugins,
      (id) => isPluginEnabled(id),
      (id) => getPluginApi(id) ?? {}
    );
  }
}
