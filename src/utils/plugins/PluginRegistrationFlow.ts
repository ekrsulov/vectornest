import { updateCanvasModeMachine } from '../../canvas/modes/CanvasModeMachine';
import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type { PluginDefinition, PluginContextFull } from '../../types/plugins';
import { logger } from '../logger';
import { unregisterExportContribution } from '../exportContributionRegistry';
import { unregisterImportContribution } from '../importContributionRegistry';
import type { PluginContributionAdapter } from './PluginContributionAdapter';
import type { PluginInteractionManager } from './PluginInteractionManager';
import type { PluginLayerManager } from './PluginLayerManager';
import type { PluginRegistry } from './PluginRegistry';
import type { UIContributionManager } from './UIContributionManager';

type PluginApiMap = Map<string, Record<string, (...args: unknown[]) => unknown>>;

export interface PluginRegistrationFlowDeps {
  isMobile: boolean;
  storeApi: CanvasStoreApi | null;
  registry: PluginRegistry;
  layerManager: PluginLayerManager;
  interactionManager: PluginInteractionManager;
  contributionAdapter: PluginContributionAdapter;
  uiContributionManager: UIContributionManager;
  pluginApis: PluginApiMap;
  pluginCleanups: Map<string, () => void>;
  isPluginEnabled: (pluginId: string) => boolean;
  applyPluginSlices: (plugin: PluginDefinition<CanvasStore>) => void;
  initializePluginApi: (plugin: PluginDefinition<CanvasStore>) => void;
  createPluginContext: (pluginId: string) => PluginContextFull<CanvasStore>;
  registerHelper: (name: string, helperFn: unknown) => void;
  unregisterExisting: (pluginId: string) => void;
  unregisterPluginSlices: (pluginId: string) => void;
  syncModePresentation: (activePluginId: string | null) => void;
  /** When true, skip mode machine update (caller is responsible for calling it once after batch) */
  skipModeMachineUpdate?: boolean;
}

const isPluginMobileSupported = (
  plugin: PluginDefinition<CanvasStore>,
  isMobile: boolean
): boolean => {
  if (!isMobile) return true;
  return plugin.supportsMobile !== false;
};

export function registerPluginFlow(
  plugin: PluginDefinition<CanvasStore>,
  deps: PluginRegistrationFlowDeps
): void {
  if (!isPluginMobileSupported(plugin, deps.isMobile)) {
    logger.info(`[PluginManager] Skipping plugin "${plugin.id}" (mobile unsupported)`);
    return;
  }

  if (deps.registry.has(plugin.id)) {
    deps.unregisterExisting(plugin.id);
  }

  deps.registry.register(plugin);
  deps.layerManager.register(plugin);
  deps.pluginApis.delete(plugin.id);

  if (deps.storeApi) {
    if (plugin.slices?.length) {
      deps.applyPluginSlices(plugin);
    }

    deps.initializePluginApi(plugin);

    if (plugin.registerHelpers) {
      const context = deps.createPluginContext(plugin.id);
      const helpers = plugin.registerHelpers(context);
      Object.entries(helpers).forEach(([name, helper]) => {
        deps.registerHelper(name, helper);
      });
    }

    if (plugin.init) {
      const context = deps.createPluginContext(plugin.id);
      const cleanup = plugin.init(context);
      if (cleanup) {
        deps.pluginCleanups.set(plugin.id, cleanup);
      }
    }
  }

  deps.interactionManager.register(
    plugin,
    (id) => deps.isPluginEnabled(id),
    (id) => deps.pluginApis.get(id) ?? {}
  );

  deps.contributionAdapter.register(plugin);

  if (plugin.sidebarPanels?.length) {
    deps.uiContributionManager.registerSidebarPanels(plugin);
  }

  if (plugin.sidebarToolbarButtons?.length) {
    deps.uiContributionManager.registerToolbarButtons(plugin.id, plugin.sidebarToolbarButtons);
  }

  if (!deps.skipModeMachineUpdate) {
    updateCanvasModeMachine(deps.registry.getAll() as PluginDefinition[]);
  }

  if (deps.storeApi?.getState().activePlugin === plugin.id) {
    deps.syncModePresentation(plugin.id);
  }
}

export function unregisterPluginFlow(
  pluginId: string,
  deps: PluginRegistrationFlowDeps
): void {
  const existing = deps.registry.get(pluginId);
  if (!existing) {
    return;
  }

  const cleanup = deps.pluginCleanups.get(pluginId);
  if (cleanup) {
    cleanup();
    deps.pluginCleanups.delete(pluginId);
  }

  deps.contributionAdapter.unregister(pluginId);
  deps.uiContributionManager.cleanup(pluginId);
  unregisterExportContribution(pluginId);
  unregisterImportContribution(pluginId);

  deps.registry.unregister(pluginId);
  deps.layerManager.unregister(pluginId);
  deps.interactionManager.unregister(pluginId);

  deps.pluginApis.delete(pluginId);

  if (existing.slices?.length) {
    deps.unregisterPluginSlices(pluginId);
  }
}
