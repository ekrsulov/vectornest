import type {
  PluginHandlerHelper,
  PluginHandlerHelpers,
} from '../../types/plugins';
import type { CanvasService, CanvasServiceContext } from '../plugins/CanvasServiceTypes';
import { logger } from '../logger';
import { PluginManagerContributionCore } from './PluginManagerContributionCore';

export abstract class PluginManagerServicesCore extends PluginManagerContributionCore {
  registerCanvasService<TState>(service: CanvasService<TState>): void {
    this.canvasServiceBindings.registerCanvasService(service);
  }

  unregisterCanvasService(serviceId: string): void {
    this.canvasServiceBindings.unregisterCanvasService(serviceId);
  }

  activateCanvasService(serviceId: string, context: CanvasServiceContext): () => void {
    return this.canvasServiceBindings.activateCanvasService(serviceId, context);
  }

  updateCanvasServiceState<TState>(serviceId: string, state: TState): void {
    this.canvasServiceBindings.updateCanvasServiceState(serviceId, state);
  }

  deactivateCanvasService(serviceId: string): void {
    this.canvasServiceBindings.deactivateCanvasService(serviceId);
  }

  registerHelper(name: string, helperFn: PluginHandlerHelper): void {
    this.helpers.register(name, helperFn);
  }

  unregisterHelper(name: string): void {
    this.helpers.unregister(name);
  }

  getHelper<T = unknown>(name: string): T | undefined {
    return this.helpers.get<T>(name);
  }

  getAllHelpers(): PluginHandlerHelpers {
    return this.helpers.getAll();
  }

  getPluginApi<T extends Record<string, (...args: unknown[]) => unknown>>(pluginId: string): T | undefined {
    return this.pluginApis.get(pluginId) as T | undefined;
  }

  callPluginApi<TArgs extends unknown[], TReturn>(
    pluginId: string,
    methodName: string,
    ...args: TArgs
  ): TReturn | undefined {
    const api = this.pluginApis.get(pluginId);
    if (!api || !api[methodName]) {
      logger.warn(`Plugin API method "${methodName}" not found in plugin "${pluginId}"`);
      return undefined;
    }
    return api[methodName](...args) as TReturn;
  }
}
