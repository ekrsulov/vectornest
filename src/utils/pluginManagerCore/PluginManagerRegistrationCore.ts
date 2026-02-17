import type { PluginApiContext, PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { registerPluginSlices, unregisterPluginSlices } from '../../store/canvasStore';
import {
  registerPluginFlow,
  unregisterPluginFlow,
  type PluginRegistrationFlowDeps,
} from '../plugins/PluginRegistrationFlow';
import { isPluginEnabled } from '../plugins/PluginBehaviorApi';
import { updateCanvasModeMachine } from '../../canvas/modes/CanvasModeMachine';
import { PluginManagerStoreBindingCore } from './PluginManagerStoreBindingCore';
import type { PluginManagerOptions } from './PluginManagerBase';

export abstract class PluginManagerRegistrationCore extends PluginManagerStoreBindingCore {
  constructor({ initialPlugins = [], ...restOptions }: PluginManagerOptions = {}) {
    super(restOptions);

    const batchDeps = { ...this.getRegistrationFlowDeps(), skipModeMachineUpdate: true };
    initialPlugins.forEach((plugin) => {
      registerPluginFlow(plugin, batchDeps);
    });
    updateCanvasModeMachine(this.registry.getAll() as PluginDefinition[]);
    this.shortcutManager.invalidateCache();
  }

  private getRegistrationFlowDeps(): PluginRegistrationFlowDeps {
    return {
      isMobile: this.isMobile,
      storeApi: this.storeApi,
      registry: this.registry,
      layerManager: this.layerManager,
      interactionManager: this.interactionManager,
      contributionAdapter: this.contributionAdapter,
      uiContributionManager: this.uiContributionManager,
      pluginApis: this.pluginApis,
      pluginCleanups: this.pluginCleanups,
      isPluginEnabled: (pluginId) => isPluginEnabled(this.storeApi, pluginId),
      applyPluginSlices: (plugin) => this.applyPluginSlices(plugin),
      initializePluginApi: (plugin) => this.initializePluginApi(plugin),
      createPluginContext: (pluginId) => this.createPluginContext(pluginId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerHelper: (name, helperFn) => this.helpers.register(name, helperFn as (...args: any[]) => any),
      unregisterExisting: (pluginId) => this.unregister(pluginId),
      unregisterPluginSlices: (pluginId) => {
        if (this.storeApi) {
          unregisterPluginSlices(this.storeApi, pluginId);
        }
      },
      syncModePresentation: (activePluginId) => this.syncModePresentationState(activePluginId),
    };
  }

  register(plugin: PluginDefinition<CanvasStore>): void {
    registerPluginFlow(plugin, this.getRegistrationFlowDeps());
    this.shortcutManager.invalidateCache();
    this.notifyRegistrationChange();
  }

  unregister(pluginId: string): void {
    unregisterPluginFlow(pluginId, this.getRegistrationFlowDeps());
    this.shortcutManager.invalidateCache();
    this.notifyRegistrationChange();
  }

  protected createPluginApiContext(): PluginApiContext<CanvasStore> {
    const storeApi = this.requireStoreApi();

    return {
      store: {
        getState: storeApi.getState,
        setState: storeApi.setState,
        subscribe: storeApi.subscribe,
      },
    };
  }

  protected applyPluginSlices(plugin: PluginDefinition<CanvasStore>): void {
    if (!plugin.slices?.length) {
      return;
    }

    const storeApi = this.requireStoreApi();
    const contributions = plugin.slices.map((factory) =>
      factory(storeApi.setState, storeApi.getState, storeApi)
    );

    registerPluginSlices(storeApi, plugin.id, contributions);
  }

  protected initializePluginApi(plugin: PluginDefinition<CanvasStore>): void {
    if (!plugin.createApi) {
      this.pluginApis.delete(plugin.id);
      return;
    }

    const api = plugin.createApi(this.createPluginApiContext());
    this.pluginApis.set(plugin.id, api as unknown as Record<string, (...args: unknown[]) => unknown>);
  }
}
