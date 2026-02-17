import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type {
  ColorModeChangeContext,
  PluginHookContribution,
  PluginRenderBehaviorContext,
  RendererOverrides,
} from '../../types/plugins';
import { logger } from '../logger';
import type { PluginRegistry } from './PluginRegistry';

type PluginStoreContext = {
  getState: CanvasStoreApi['getState'];
  setState: CanvasStoreApi['setState'];
  subscribe: CanvasStoreApi['subscribe'];
};

export function isPluginEnabled(
  storeApi: CanvasStoreApi | null,
  pluginId: string
): boolean {
  if (!storeApi) return true;

  // Always enable pluginSelector to prevent lockout.
  if (pluginId === 'pluginSelector') return true;

  const state = storeApi.getState();
  const psState = (state as Record<string, unknown>).pluginSelector as {
    enabledPlugins?: string[];
  } | undefined;

  if (!psState || !psState.enabledPlugins) return true;
  if (psState.enabledPlugins.length === 0) return true;

  return psState.enabledPlugins.includes(pluginId);
}

export function notifyColorModeChange(params: {
  prevColorMode: 'light' | 'dark';
  nextColorMode: 'light' | 'dark';
  storeApi: CanvasStoreApi | null;
  registry: PluginRegistry;
  isPluginEnabled: (pluginId: string) => boolean;
}): void {
  const { prevColorMode, nextColorMode, storeApi, registry, isPluginEnabled } = params;
  if (!storeApi) return;

  const store: PluginStoreContext = {
    getState: storeApi.getState,
    setState: storeApi.setState,
    subscribe: storeApi.subscribe,
  };

  const context: ColorModeChangeContext<CanvasStore> = {
    prevColorMode,
    nextColorMode,
    store,
  };

  for (const plugin of registry.values()) {
    if (!plugin.onColorModeChange) continue;
    if (!isPluginEnabled(plugin.id)) continue;

    try {
      plugin.onColorModeChange(context as never);
    } catch (error) {
      logger.error(`Error in onColorModeChange handler for plugin ${plugin.id}`, error);
    }
  }
}

export function getRendererOverrides(params: {
  storeApi: CanvasStoreApi | null;
  registry: PluginRegistry;
  isPluginEnabled: (pluginId: string) => boolean;
  context: PluginRenderBehaviorContext;
}): RendererOverrides {
  const { storeApi, registry, isPluginEnabled, context } = params;
  if (!storeApi) return {};

  const state = storeApi.getState();
  const overrides: RendererOverrides = { element: {} };

  for (const plugin of registry.values()) {
    if (!plugin.renderBehavior) continue;
    if (!isPluginEnabled(plugin.id)) continue;

    const pluginOverrides = plugin.renderBehavior(state, context);
    if (!pluginOverrides) continue;

    overrides.path = { ...overrides.path, ...pluginOverrides.path };
    if (pluginOverrides.element) {
      overrides.element = { ...(overrides.element ?? {}), ...pluginOverrides.element };
    }
  }

  if (overrides.element && Object.keys(overrides.element).length === 0) {
    delete overrides.element;
  }

  return overrides;
}

export function isGlobalUndoRedoDisabled(params: {
  storeApi: CanvasStoreApi | null;
  registry: PluginRegistry;
}): boolean {
  const { storeApi, registry } = params;
  if (!storeApi) return false;

  const state = storeApi.getState();
  const activePluginId = state.activePlugin;
  if (!activePluginId) return false;

  const plugin = registry.get(activePluginId);
  if (!plugin?.disablesGlobalUndoRedo) return false;

  return plugin.disablesGlobalUndoRedo(state);
}

export function getPluginHooks(
  registry: PluginRegistry,
  pluginId: string | null
): PluginHookContribution[] {
  if (!pluginId) return [];
  const plugin = registry.get(pluginId);
  return plugin?.hooks ?? [];
}

export function getGlobalPluginHooks(registry: PluginRegistry): PluginHookContribution[] {
  const globalHooks: PluginHookContribution[] = [];

  Array.from(registry.values()).forEach((plugin) => {
    if (!plugin.hooks) return;
    plugin.hooks.forEach((hook) => {
      if (hook.global) {
        globalHooks.push(hook);
      }
    });
  });

  return globalHooks;
}
