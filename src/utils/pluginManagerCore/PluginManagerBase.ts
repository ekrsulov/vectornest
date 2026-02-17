import type { PluginContextFull, PluginDefinition } from '../../types/plugins';
import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import { PluginRegistry } from '../plugins/PluginRegistry';
import { ServiceLocator } from '../plugins/ServiceLocator';
import { createCanvasServiceBindings } from '../plugins/CanvasServiceBindings';
import { CanvasDecoratorStore } from '../plugins/CanvasDecoratorStore';
import { HelperRegistry } from '../plugins/HelperRegistry';
import { ToolManager } from '../plugins/ToolManager';
import { PluginLayerManager } from '../plugins/PluginLayerManager';
import { PluginInteractionManager } from '../plugins/PluginInteractionManager';
import type { PluginContextManager } from '../plugins/PluginContextManager';
import { LifecycleManager, createLifecycleManager } from '../plugins/LifecycleManager';
import { createLifecycleCompatibilityAdapter } from '../plugins/LifecycleCompatibilityAdapter';
import { BehaviorFlagsManager, createBehaviorFlagsManager } from '../plugins/BehaviorFlagsManager';
import { UIContributionManager, createUIContributionManager } from '../plugins/UIContributionManager';
import { ShortcutManager, createShortcutManager } from '../plugins/ShortcutManager';
import { createPluginContributionAdapter } from '../plugins/PluginContributionAdapter';
import { isPluginEnabled } from '../plugins/PluginBehaviorApi';
import { isMobileViewport } from '../useDevice';

export interface PluginManagerOptions {
  initialPlugins?: PluginDefinition<CanvasStore>[];
  storeApi?: CanvasStoreApi | null;
}

export abstract class PluginManagerBase {
  protected registry = new PluginRegistry();
  protected services = new ServiceLocator();
  protected helpers = new HelperRegistry();
  protected tools = new ToolManager(this.registry);
  protected canvasServiceBindings = createCanvasServiceBindings(this.services);
  protected canvasDecoratorStore = new CanvasDecoratorStore();
  protected layerManager = new PluginLayerManager();
  protected interactionManager = new PluginInteractionManager();
  protected contextManager: PluginContextManager | null = null;
  protected lifecycleManager: LifecycleManager = createLifecycleManager();
  protected lifecycleCompatibility = createLifecycleCompatibilityAdapter(this.lifecycleManager);
  protected behaviorFlagsManager: BehaviorFlagsManager<CanvasStore>;
  protected uiContributionManager: UIContributionManager;
  protected shortcutManager: ShortcutManager;
  protected contributionAdapter = createPluginContributionAdapter();

  protected pluginCleanups = new Map<string, () => void>();
  protected pluginApis = new Map<string, Record<string, (...args: unknown[]) => unknown>>();
  protected storeApi: CanvasStoreApi | null;
  protected storeSubscriptionCleanup: (() => void) | null = null;
  protected isMobile = isMobileViewport();

  /** Listeners notified when plugins are registered or unregistered. */
  private registrationChangeListeners = new Set<() => void>();

  protected abstract createPluginContext(pluginId: string): PluginContextFull<CanvasStore>;
  public abstract executeLifecycleAction(actionId: string): void;
  public abstract getGlobalTransitionActions(): string[];

  constructor({ storeApi = null }: PluginManagerOptions = {}) {
    this.storeApi = storeApi;

    this.behaviorFlagsManager = createBehaviorFlagsManager({
      getStoreApi: () => this.storeApi,
      getPlugin: (id) => this.registry.get(id),
      getAllPlugins: () => this.registry.getAll(),
      getActivePluginId: (state) => state.activePlugin,
    });

    this.uiContributionManager = createUIContributionManager(
      () => this.registry.getAll(),
      (id) => isPluginEnabled(this.storeApi, id),
      () => this.storeApi?.getState() ?? null,
      (id) => this.registry.get(id)
    );

    this.shortcutManager = createShortcutManager(
      () => this.registry.getAll(),
      (id) => isPluginEnabled(this.storeApi, id),
      () => this.storeApi?.getState().activePlugin ?? null,
      (id) => this.registry.get(id)
    );
  }

  /**
   * Subscribe to plugin registration changes.
   * Returns an unsubscribe function.
   */
  onPluginRegistrationChange(listener: () => void): () => void {
    this.registrationChangeListeners.add(listener);
    return () => { this.registrationChangeListeners.delete(listener); };
  }

  /** Notify all registration change listeners. */
  protected notifyRegistrationChange(): void {
    this.registrationChangeListeners.forEach((listener) => {
      try { listener(); } catch { /* swallow */ }
    });
  }
}
