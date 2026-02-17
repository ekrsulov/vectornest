import { useRef, useEffect } from 'react';
import { CanvasEventBus } from '../CanvasEventBusContext';
import { pluginManager } from '../../utils/pluginManager';

/**
 * Hook that initializes and manages the canvas event bus lifecycle.
 * Handles plugin manager registration and cleanup.
 * 
 * @returns The initialized event bus instance
 */
export function useCanvasEventBusManager(): CanvasEventBus {
  const eventBusRef = useRef<CanvasEventBus | null>(null);

  if (!eventBusRef.current) {
    eventBusRef.current = new CanvasEventBus();
  }

  useEffect(() => {
    const bus = eventBusRef.current!;
    pluginManager.setEventBus(bus);

    return () => {
      pluginManager.setEventBus(null);
      bus.clear();
    };
  }, []);

  return eventBusRef.current;
}
