import type { CanvasDecorator } from '../../types/interaction';

export class CanvasDecoratorStore {
  private decorators = new Map<string, CanvasDecorator>();

  register(decorator: CanvasDecorator): () => void {
    this.decorators.set(decorator.id, decorator);
    return () => {
      this.decorators.delete(decorator.id);
    };
  }

  getAll(): CanvasDecorator[] {
    return Array.from(this.decorators.values());
  }

  getByPlacement(placement: CanvasDecorator['placement']): CanvasDecorator[] {
    return this.getAll().filter((decorator) => decorator.placement === placement);
  }
}
