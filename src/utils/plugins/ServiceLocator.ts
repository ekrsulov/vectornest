import type { CanvasService, CanvasServiceContext, CanvasServiceInstance } from './CanvasServiceTypes';

export class ServiceLocator {
    private services = new Map<string, CanvasService<unknown>>();
    private activeServices = new Map<string, CanvasServiceInstance<unknown>>();

    register<TState>(service: CanvasService<TState>): void {
        this.services.set(service.id, service as CanvasService<unknown>);
    }

    unregister(serviceId: string): void {
        this.deactivate(serviceId);
        this.services.delete(serviceId);
    }

    activate(serviceId: string, context: CanvasServiceContext): () => void {
        const service = this.services.get(serviceId);
        if (!service) {
            throw new Error(`Canvas service "${serviceId}" is not registered.`);
        }

        this.deactivate(serviceId);

        const instance = service.create(context);
        this.activeServices.set(serviceId, instance);

        return () => this.deactivate(serviceId);
    }

    deactivate(serviceId: string): void {
        const instance = this.activeServices.get(serviceId);
        if (!instance) {
            return;
        }

        instance.dispose();
        this.activeServices.delete(serviceId);
    }

    updateState<TState>(serviceId: string, state: TState): void {
        const instance = this.activeServices.get(serviceId) as CanvasServiceInstance<TState> | undefined;
        instance?.update?.(state);
    }

    has(serviceId: string): boolean {
        return this.services.has(serviceId);
    }
}
