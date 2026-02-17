import type { CanvasStoreApi } from '../../store/canvasStore';
import type { CanvasEventBus } from '../../canvas/CanvasEventBusContext';
import type { CanvasControllerActions } from '../../canvas/controller/CanvasControllerContext';

export interface CanvasServiceContext {
  svg: SVGSVGElement;
  controller: CanvasControllerActions;
  eventBus: CanvasEventBus;
  store: CanvasStoreApi;
}

export interface CanvasServiceInstance<TState = unknown> {
  update?: (state: TState) => void;
  dispose: () => void;
}

export interface CanvasService<TState = unknown> {
  id: string;
  create: (context: CanvasServiceContext) => CanvasServiceInstance<TState>;
}
