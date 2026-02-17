import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type {
  CanvasEventBus,
} from '../../canvas/CanvasEventBusContext';
import type { PluginContextManager } from '../plugins/PluginContextManager';
import { LifecycleManager } from '../plugins/LifecycleManager';
import {
  bootstrapStoreBinding,
  subscribeToStoreChanges,
} from '../plugins/PluginStoreBindingApi';
import {
  handleActivePluginChange as handleActivePluginChangeFromStore,
  syncModePresentation,
} from '../plugins/PluginModeTransitionApi';
import { applyEventBusBinding } from '../plugins/PluginEventBusBindingApi';
import { PluginManagerBase } from './PluginManagerBase';

export abstract class PluginManagerStoreBindingCore extends PluginManagerBase {
  protected abstract applyPluginSlices(plugin: PluginDefinition<CanvasStore>): void;
  protected abstract initializePluginApi(plugin: PluginDefinition<CanvasStore>): void;

  setStoreApi(storeApi: CanvasStoreApi): void {
    this.storeApi = storeApi;
    this.attachStoreSubscriptions();
    this.contextManager = bootstrapStoreBinding(storeApi, {
      pluginApis: this.pluginApis,
      pluginCleanups: this.pluginCleanups,
      registry: this.registry,
      applyPluginSlices: (plugin) => this.applyPluginSlices(plugin),
      initializePluginApi: (plugin) => this.initializePluginApi(plugin),
      createPluginContext: (pluginId) => this.createPluginContext(pluginId),
      syncModePresentation: (activePluginId) => this.syncModePresentationState(activePluginId),
      onContextManagerReady: (contextManager) => {
        this.contextManager = contextManager;
      },
    });

    this.interactionManager.setContextManager(this.contextManager);
    this.contextManager.setEventBus(this.interactionManager.getEventBus());
  }

  public requireStoreApi(): CanvasStoreApi {
    if (!this.storeApi) {
      throw new Error(
        'Canvas store API is not available. Ensure PluginManager.setStoreApi() is called before using store-dependent features.'
      );
    }

    return this.storeApi;
  }

  public getStoreApi(): CanvasStoreApi | null {
    return this.storeApi;
  }

  private detachStoreSubscriptions(): void {
    if (this.storeSubscriptionCleanup) {
      this.storeSubscriptionCleanup();
      this.storeSubscriptionCleanup = null;
    }
  }

  private attachStoreSubscriptions(): void {
    this.detachStoreSubscriptions();
    if (!this.storeApi) {
      return;
    }

    this.storeSubscriptionCleanup = subscribeToStoreChanges(this.storeApi, {
      onActivePluginChange: (previousPlugin, nextPlugin) => {
        this.handleStoreActivePluginChange(previousPlugin, nextPlugin);
      },
      onElementDeleted: () => {
        this.executeLifecycleAction('onElementDeleted');
      },
    });
  }

  protected syncModePresentationState(activePluginId: string | null): void {
    if (!this.storeApi) {
      return;
    }

    syncModePresentation(this.storeApi, this.registry, activePluginId);
  }

  private handleStoreActivePluginChange(
    previousPlugin: string | null,
    nextPlugin: string | null
  ): void {
    if (!this.storeApi) {
      return;
    }

    handleActivePluginChangeFromStore({
      previousPlugin,
      nextPlugin,
      storeApi: this.storeApi,
      registry: this.registry,
      executeLifecycleAction: (actionId) => this.executeLifecycleAction(actionId),
      getGlobalTransitionActions: () => this.getGlobalTransitionActions(),
    });
  }

  setEventBus(eventBus: CanvasEventBus | null): void {
    applyEventBusBinding({
      eventBus,
      interactionManager: this.interactionManager,
      contextManager: this.contextManager,
      plugins: this.getAll(),
      isPluginEnabled: (pluginId) => this.isPluginEnabled(pluginId),
      getPluginApi: (pluginId) => this.pluginApis.get(pluginId),
    });
  }

  getEventBus(): CanvasEventBus | null {
    return this.interactionManager.getEventBus();
  }

  getContextManager(): PluginContextManager | null {
    return this.contextManager;
  }

  getLifecycleManager(): LifecycleManager {
    return this.lifecycleManager;
  }

  abstract getAll(): PluginDefinition<CanvasStore>[];
  abstract isPluginEnabled(pluginId: string): boolean;
}
