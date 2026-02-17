import type { CanvasStore, CanvasStoreApi } from '../../store/canvasStore';
import type {
  CanvasEventBus,
  CanvasPointerEventHelpers,
  CanvasPointerEventPayload,
  CanvasPointerEventState,
} from '../../canvas/CanvasEventBusContext';
import type { Point } from '../../types';
import type {
  PluginHooksContext,
  PluginContextFull,
  ContextCapability,
} from '../../types/plugins';
import { buildPluginContext } from '../pluginContextBuilder';

/**
 * PluginContextManager handles the creation and management of plugin contexts.
 *
 * Provides unified context creation for different plugin scenarios:
 * - Handler contexts (for event handlers)
 * - Hook contexts (for React hooks)
 * - API contexts (for plugin APIs)
 * - Full contexts (with all capabilities)
 *
 * The manager is injected into the PluginManager and provides a single
 * source of truth for context creation, ensuring consistency across all plugin callbacks.
 *
 * @example
 * ```ts
 * const contextManager = new PluginContextManager(storeApi, pluginApis);
 * contextManager.setEventBus(eventBus);
 * contextManager.setController(controller);
 *
 * // Create handler context
 * const handlerContext = contextManager.createHandlerContext('my-plugin');
 *
 * // Create hooks context
 * const hooksContext = contextManager.createHooksContext();
 *
 * // Create full context with all capabilities
 * const fullContext = contextManager.createFullContext('my-plugin');
 * ```
 */
export class PluginContextManager {
  private storeApi: CanvasStoreApi;
  private eventBus: CanvasEventBus | null = null;
  private controller: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    screenToCanvas: (x: number, y: number) => Point;
  } | null = null;
  private pointerState: CanvasPointerEventState | null = null;
  private pluginApis: Map<string, Record<string, (...args: never[]) => unknown>>;

  constructor(
    storeApi: CanvasStoreApi,
    pluginApis: Map<string, Record<string, (...args: never[]) => unknown>>
  ) {
    this.storeApi = storeApi;
    this.pluginApis = pluginApis;
  }

  setEventBus(eventBus: CanvasEventBus | null): void {
    this.eventBus = eventBus;
  }

  setController(controller: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    screenToCanvas: (x: number, y: number) => Point;
  } | null): void {
    this.controller = controller;
  }

  setPointerState(pointerState: CanvasPointerEventState | null): void {
    this.pointerState = pointerState;
  }

  setPluginApis(pluginApis: Map<string, Record<string, (...args: never[]) => unknown>>): void {
    this.pluginApis = pluginApis;
  }

  private buildEmitPointerEvent(eventBus: CanvasEventBus) {
    return (
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      event: PointerEvent,
      point: Point
    ) => {
      const helpers: CanvasPointerEventHelpers = {};
      const state: CanvasPointerEventState = {};
      const payload: CanvasPointerEventPayload = {
        event,
        point,
        target: null,
        activePlugin: this.storeApi.getState().activePlugin,
        helpers,
        state,
      };
      eventBus.emit(type, payload as never);
    };
  }

  /**
   * Creates a handler context for the specified plugin.
   * Used for event handlers, lifecycle methods, and plugin APIs.
   */
  createHandlerContext(pluginId: string): PluginContextFull<CanvasStore> {
    const api = this.pluginApis.get(pluginId) ?? {};
    return buildPluginContext({
      store: this.storeApi,
      api: api as unknown as Record<string, (...args: unknown[]) => unknown>,
      helpers: {}, // Populated by helper registry
      pointerState: this.pointerState ?? undefined,
      pluginApis: this.pluginApis as unknown as ReadonlyMap<
        string,
        Record<string, (...args: unknown[]) => unknown>
      >,
    });
  }

  /**
   * Creates a hook context for React hooks.
   * Used for plugin React hooks that need canvas access.
   *
   * Note: This requires controller and eventBus to be set first.
   */
  createHooksContext(): PluginHooksContext {
    if (!this.controller || !this.eventBus) {
      throw new Error('CanvasController or EventBus not available. Ensure setController() and setEventBus() are called.');
    }

    // Store in locals to avoid closure issues
    const eventBus = this.eventBus;
    const storeApi = this.storeApi;
    const controller = this.controller;

    return {
      svgRef: controller.svgRef,
      screenToCanvas: controller.screenToCanvas,
      emitPointerEvent: this.buildEmitPointerEvent(eventBus),
      activePlugin: storeApi.getState().activePlugin,
      viewportZoom: storeApi.getState().viewport.zoom,
      scaleStrokeWithZoom: storeApi.getState().scaleStrokeWithZoom,
    };
  }

  /**
   * Creates a full context with all capabilities.
   * Combines handler context with hook context extensions.
   *
   * Note: This requires controller and eventBus to be set first.
   */
  createFullContext(pluginId?: string): PluginContextFull<CanvasStore> {
    const api = this.pluginApis.get(pluginId || '') ?? {};
    const hasCanvasContext = this.controller && this.eventBus;

    return buildPluginContext({
      store: this.storeApi,
      api: api as unknown as Record<string, (...args: unknown[]) => unknown>,
      helpers: {},
      pointerState: this.pointerState ?? undefined,
      pluginApis: this.pluginApis as unknown as ReadonlyMap<
        string,
        Record<string, (...args: unknown[]) => unknown>
      >,
      ...(hasCanvasContext
        ? {
            svgRef: this.controller!.svgRef,
            screenToCanvas: this.controller!.screenToCanvas,
            emitPointerEvent: this.buildEmitPointerEvent(this.eventBus!),
          }
        : {}),
    });
  }

  /**
   * Creates a context with a specific capability tag.
   * Used internally for type-safe context passing.
   */
  createContextWithCapability<TCapability extends string>(
    context: PluginContextFull<CanvasStore>,
    capability: TCapability
  ): PluginContextFull<CanvasStore> & ContextCapability<TCapability> {
    return {
      ...context,
      __capability: capability,
    } as PluginContextFull<CanvasStore> & ContextCapability<TCapability>;
  }

  /**
   * Gets the current state snapshot.
   * Useful for creating context snapshots.
   */
  getCurrentState(): CanvasStore {
    return this.storeApi.getState();
  }

  /**
   * Gets the current API map.
   * Returns all registered plugin APIs.
   */
  getApis(): Map<string, Record<string, (...args: never[]) => unknown>> {
    return this.pluginApis;
  }

  /**
   * Gets the API for a specific plugin.
   */
  getPluginApi(pluginId: string): Record<string, (...args: never[]) => unknown> | undefined {
    return this.pluginApis.get(pluginId);
  }

  /**
   * Updates the pointer state.
   * Called during pointer event handling.
   */
  updatePointerState(newState: Partial<CanvasPointerEventState>): void {
    this.pointerState = {
      ...this.pointerState,
      ...newState,
    };
  }

  /**
   * Validates that a context has the required capabilities.
   * Throws an error if validation fails.
   *
   * @param context - The context to validate
   * @param requiredCapabilities - Array of capability names that must be present
   * @throws Error if context lacks required capabilities
   */
  validateContext<TCapability extends string>(
    context: PluginContextFull<CanvasStore>,
    requiredCapabilities: TCapability[]
  ): context is PluginContextFull<CanvasStore> & ContextCapability<TCapability> {
    for (const capability of requiredCapabilities) {
      if ('__capability' in context && context.__capability === capability) {
        continue;
      }
      // If no capability tag, check for the actual properties
      switch (capability) {
        case 'store':
          if (!context.store) {
            throw new Error(`Context missing required capability: ${capability}`);
          }
          break;
        case 'api':
          if (!context.api) {
            throw new Error(`Context missing required capability: ${capability}`);
          }
          break;
        case 'canvas':
          if (!context.svgRef || !context.screenToCanvas || !context.emitPointerEvent) {
            throw new Error(`Context missing required capability: ${capability}`);
          }
          break;
        case 'helpers':
          if (!context.helpers) {
            throw new Error(`Context missing required capability: ${capability}`);
          }
          break;
        default:
          // Unknown capability, check for __capability tag
          if (!('__capability' in context) || context.__capability !== capability) {
            throw new Error(`Context missing required capability: ${capability}`);
          }
      }
    }
    return true;
  }

  /**
   * Check if the manager has all required dependencies initialized.
   * Useful for ensuring eventBus and controller are set before operations.
   *
   * @returns Object indicating which dependencies are available
   */
  getDependenciesStatus(): {
    storeApi: boolean;
    eventBus: boolean;
    controller: boolean;
    pluginApis: boolean;
  } {
    return {
      storeApi: this.storeApi !== null,
      eventBus: this.eventBus !== null,
      controller: this.controller !== null,
      pluginApis: this.pluginApis.size > 0,
    };
  }

  /**
   * Ensure that all required dependencies are initialized.
   * Throws an error if any required dependency is missing.
   *
   * @param requirements - Object specifying which dependencies are required
   * @throws Error if any required dependency is missing
   */
  requireDependencies(requirements: {
    storeApi?: boolean;
    eventBus?: boolean;
    controller?: boolean;
    pluginApis?: boolean;
  }): void {
    const status = this.getDependenciesStatus();

    if (requirements.storeApi && !status.storeApi) {
      throw new Error('PluginContextManager: storeApi is required but not available');
    }
    if (requirements.eventBus && !status.eventBus) {
      throw new Error('PluginContextManager: eventBus is required but not available');
    }
    if (requirements.controller && !status.controller) {
      throw new Error('PluginContextManager: controller is required but not available');
    }
    if (requirements.pluginApis && !status.pluginApis) {
      throw new Error('PluginContextManager: pluginApis are required but none are available');
    }
  }
}

/**
 * Factory function to create a PluginContextManager.
 * Ensures all required dependencies are provided.
 */
export function createPluginContextManager(
  storeApi: CanvasStoreApi,
  pluginApis: Map<string, Record<string, (...args: never[]) => unknown>>
): PluginContextManager {
  return new PluginContextManager(storeApi, pluginApis);
}
