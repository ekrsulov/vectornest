import type { CanvasEventBus, CanvasPointerEventPayload } from '../../../canvas/CanvasEventBusContext';
import { useCanvasStore } from '../../../store/canvasStore';
import type { TransformationPluginSlice } from '../slice';

/**
 * TransformationService manages transformation interactions by listening to canvas events.
 * It handles both regular and advanced transformations, coordinating with the store.
 */
class TransformationService {
  private unsubscribers: (() => void)[] = [];

  /**
   * Register the service with the canvas event bus
   */
  register(eventBus: CanvasEventBus): void {
    this.unsubscribers.push(
      eventBus.subscribe('pointermove', this.handlePointerMove)
    );
    this.unsubscribers.push(
      eventBus.subscribe('pointerup', this.handlePointerUp)
    );
  }

  /**
   * Unregister the service and clean up listeners
   */
  unregister(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Handle pointer move events during transformation
   */
  private handlePointerMove = (payload: CanvasPointerEventPayload) => {
    const store = useCanvasStore.getState();
    const transformState = (store as unknown as TransformationPluginSlice).transformState;
    const advancedTransformState = (store as unknown as TransformationPluginSlice).advancedTransformState;
    const transformationHandlers = (store as unknown as TransformationPluginSlice).transformationHandlers;
    
    if (!transformationHandlers) return;

    // Handle regular transformation
    if (transformState?.isTransforming) {
      const isShiftPressed = payload.event.shiftKey;
      transformationHandlers.updateTransformation(payload.point, isShiftPressed);
    }

    // Handle advanced transformation
    if (advancedTransformState?.isTransforming) {
      transformationHandlers.updateAdvancedTransformation(payload.point);
    }
  };

  /**
   * Handle pointer up events to end transformations
   */
  private handlePointerUp = (_payload: CanvasPointerEventPayload) => {
    const store = useCanvasStore.getState();
    const transformState = (store as unknown as TransformationPluginSlice).transformState;
    const advancedTransformState = (store as unknown as TransformationPluginSlice).advancedTransformState;
    const transformationHandlers = (store as unknown as TransformationPluginSlice).transformationHandlers;
    
    if (!transformationHandlers) return;

    // End regular transformation
    if (transformState?.isTransforming) {
      transformationHandlers.endTransformation();
    }

    // End advanced transformation
    if (advancedTransformState?.isTransforming) {
      transformationHandlers.endAdvancedTransformation();
    }
  };
}

// Export singleton instance
export const transformationService = new TransformationService();
