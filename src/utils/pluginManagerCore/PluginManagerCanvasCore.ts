import type { CanvasLayerContribution } from '../../types/plugins';
import type { CanvasEventMap } from '../../canvas/CanvasEventBusContext';
import type { CanvasDecorator, DragModifier, ElementDragModifier } from '../../types/interaction';
import { PluginManagerRegistrationCore } from './PluginManagerRegistrationCore';

export abstract class PluginManagerCanvasCore extends PluginManagerRegistrationCore {
  registerInteractionHandler<K extends keyof CanvasEventMap>(
    pluginId: string,
    eventType: K,
    handler: (payload: CanvasEventMap[K]) => void
  ): () => void {
    return this.interactionManager.registerInteractionHandler(pluginId, eventType, handler);
  }

  registerCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
    this.layerManager.registerCanvasLayers(pluginId, layers);
  }

  unregisterCanvasLayers(pluginId: string): void {
    this.layerManager.unregisterCanvasLayers(pluginId);
  }

  getCanvasLayers(): Array<CanvasLayerContribution & { pluginId: string }> {
    return this.layerManager.getCanvasLayers((id) => this.isPluginEnabled(id));
  }

  registerDragModifier(modifier: DragModifier): () => void {
    return this.interactionManager.registerDragModifier(modifier);
  }

  getDragModifiers(): DragModifier[] {
    return this.interactionManager.getDragModifiers();
  }

  registerElementDragModifier(modifier: ElementDragModifier): () => void {
    return this.interactionManager.registerElementDragModifier(modifier);
  }

  getElementDragModifiers(): ElementDragModifier[] {
    return this.interactionManager.getElementDragModifiers();
  }

  registerCanvasDecorator(decorator: CanvasDecorator): () => void {
    return this.canvasDecoratorStore.register(decorator);
  }

  getCanvasDecorators(): CanvasDecorator[] {
    return this.canvasDecoratorStore.getAll();
  }

  getCanvasDecoratorsByPlacement(placement: CanvasDecorator['placement']): CanvasDecorator[] {
    return this.canvasDecoratorStore.getByPlacement(placement);
  }

  abstract isPluginEnabled(pluginId: string): boolean;
}
