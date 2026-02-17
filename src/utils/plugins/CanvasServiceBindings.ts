import type { ServiceLocator } from './ServiceLocator';
import type { CanvasService, CanvasServiceContext } from './CanvasServiceTypes';

export interface CanvasServiceBindings {
  registerCanvasService<TState>(service: CanvasService<TState>): void;
  unregisterCanvasService(serviceId: string): void;
  activateCanvasService(serviceId: string, context: CanvasServiceContext): () => void;
  updateCanvasServiceState<TState>(serviceId: string, state: TState): void;
  deactivateCanvasService(serviceId: string): void;
}

export function createCanvasServiceBindings(services: ServiceLocator): CanvasServiceBindings {
  return {
    registerCanvasService<TState>(service: CanvasService<TState>): void {
      services.register(service);
    },
    unregisterCanvasService(serviceId: string): void {
      services.unregister(serviceId);
    },
    activateCanvasService(serviceId: string, context: CanvasServiceContext): () => void {
      return services.activate(serviceId, context);
    },
    updateCanvasServiceState<TState>(serviceId: string, state: TState): void {
      services.updateState(serviceId, state);
    },
    deactivateCanvasService(serviceId: string): void {
      services.deactivate(serviceId);
    },
  };
}
