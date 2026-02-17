import { useEffect } from 'react';
import type { PluginHooksContext } from '../../../types/plugins';
import { useCanvasTransformControls } from './useCanvasTransformControls';
import { useAdvancedTransformControls } from './useAdvancedTransformControls';
import { transformationService } from '../listeners/TransformationService';
import { useCanvasEventBus } from '../../../canvas/CanvasEventBusContext';
import { useCanvasStore } from '../../../store/canvasStore';
import type { TransformationPluginSlice } from '../slice';

/**
 * Unified transformation hook for the transformation plugin.
 * Combines regular and advanced transformation controls.
 * This hook is executed globally when registered with global: true.
 */
export function useTransformationHook(_context: PluginHooksContext): void {
  const eventBus = useCanvasEventBus();

  // Register the transformation service with the event bus
  useEffect(() => {
    transformationService.register(eventBus);
    return () => {
      transformationService.unregister();
    };
  }, [eventBus]);

  // Get handlers from both hooks
  const {
    startTransformation,
    updateTransformation,
    endTransformation,
  } = useCanvasTransformControls();

  const {
    startAdvancedTransformation,
    updateAdvancedTransformation,
    endAdvancedTransformation,
  } = useAdvancedTransformControls();

  // Store handlers in the store so Canvas.tsx can access them
  const setTransformationHandlers = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).setTransformationHandlers
  );

  useEffect(() => {
    setTransformationHandlers?.({
      startTransformation,
      updateTransformation,
      endTransformation,
      startAdvancedTransformation,
      updateAdvancedTransformation,
      endAdvancedTransformation,
    });
  }, [
    startTransformation,
    updateTransformation,
    endTransformation,
    startAdvancedTransformation,
    updateAdvancedTransformation,
    endAdvancedTransformation,
    setTransformationHandlers,
  ]);

  // Control path interaction based on transformation state
  const transformState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformState
  );
  const advancedTransformState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).advancedTransformState
  );
  const setPathInteractionDisabled = useCanvasStore(state => state.setPathInteractionDisabled);

  useEffect(() => {
    const isTransforming = 
      transformState?.isTransforming || 
      advancedTransformState?.isTransforming || 
      false;
    
    setPathInteractionDisabled?.(isTransforming);
  }, [transformState?.isTransforming, advancedTransformState?.isTransforming, setPathInteractionDisabled]);
}
