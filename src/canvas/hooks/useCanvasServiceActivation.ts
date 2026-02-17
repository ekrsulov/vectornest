import { useEffect, useRef, type RefObject } from 'react';
import type { CanvasControllerActions } from '../controller/CanvasControllerContext';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasControllerActions } from '../controller/CanvasControllerContext';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { canvasStoreApi } from '../../store/canvasStore';

/**
 * Configuration for canvas service activation
 */
export interface CanvasServiceConfig<TState = unknown> {
  /** Unique service ID */
  serviceId: string;
  /** SVG reference */
  svgRef: RefObject<SVGSVGElement | null>;
  /** 
   * Optional state selector to compute service state.
   * Only provide if the service registered via pluginManager.registerCanvasService 
   * explicitly supports state updates (i.e., it has a state handler registered).
   * If provided, this function will be called whenever stateDeps change,
   * and the result will be passed to the service's state update handler.
   */
  selectState?: (deps: {
    controller: CanvasControllerActions;
    eventBus: ReturnType<typeof useCanvasEventBus>;
  }) => TState;
  /** Optional dependencies array for state updates */
  stateDeps?: unknown[];
}

/**
 * Generic hook to activate and manage canvas services
 * Handles the common pattern of:
 * 1. Activating a service on mount
 * 2. Optionally updating service state when dependencies change
 * 3. Cleaning up on unmount
 * 
 * @example
 * ```tsx
 * useCanvasServiceActivation({
 *   serviceId: ZOOM_SERVICE_ID,
 *   svgRef,
 * });
 * ```
 * 
 * @example
 * ```tsx
 * useCanvasServiceActivation({
 *   serviceId: PLUGIN_SERVICE_ID,
 *   svgRef,
 *   selectState: ({ controller }) => ({
 *     activePlugin,
 *     isPluginToolActive,
 *     screenToCanvas,
 *   }),
 *   stateDeps: [activePlugin, isPluginToolActive, screenToCanvas],
 * });
 * ```
 */
export function useCanvasServiceActivation<TState = unknown>({
  serviceId,
  svgRef,
  selectState,
  stateDeps = [],
}: CanvasServiceConfig<TState>): void {
  const controllerActions = useCanvasControllerActions();
  const eventBus = useCanvasEventBus();

  // Track if service is activated to prevent duplicate updates
  const isActivatedRef = useRef(false);

  // Activate service on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      isActivatedRef.current = false;
      return;
    }

    const cleanup = pluginManager.activateCanvasService(serviceId, {
      svg,
      controller: controllerActions,
      eventBus,
      store: canvasStoreApi,
    });

    isActivatedRef.current = true;

    return () => {
      isActivatedRef.current = false;
      cleanup?.();
    };
    // Only reactivate if core dependencies change
  }, [eventBus, svgRef, serviceId, controllerActions]);

  // Update service state when dependencies change
  useEffect(() => {
    if (!selectState || !isActivatedRef.current) {
      return;
    }

    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    const state = selectState({ controller: controllerActions, eventBus });
    pluginManager.updateCanvasServiceState(serviceId, state);
    // Only depend on stateDeps, not selectState itself to avoid recreating on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, eventBus, svgRef, controllerActions, ...stateDeps]);
}
