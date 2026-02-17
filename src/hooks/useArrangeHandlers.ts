import { useCanvasStore } from '../store/canvasStore';
import { useMemo, useCallback } from 'react';
import { pluginManager } from '../utils/pluginManager';

/**
 * Default arrange handler configurations for built-in modes.
 * Plugins can override these by providing arrangeConfig in their definition.
 */
const DEFAULT_ARRANGE_CONFIGS: Record<string, { suffix: string; includeOrder: boolean; orderSuffix?: string }> = {
  select: { suffix: '', includeOrder: true },
  edit: { suffix: 'Commands', includeOrder: false },
  subpath: { suffix: 'Subpaths', includeOrder: true, orderSuffix: 'Subpath' },
};

/**
 * Hook that provides the appropriate handlers based on the active plugin.
 * 
 * Uses useCallback pattern to ensure handlers always access the latest store state
 * while maintaining stable references for React optimization.
 * 
 * Plugins can declare their arrange handler configuration in their definition
 * via arrangeConfig property, or fall back to default configurations.
 */
export const useArrangeHandlers = () => {
  // Only subscribe to activePlugin, not the entire store
  const activePlugin = useCanvasStore(state => state.activePlugin);
  
  // Create stable getter to always access current store state
  const getStore = useCallback(() => useCanvasStore.getState(), []);

  // Memoize handler maps to prevent recreation on every render
  const handlers = useMemo(() => {
    /** Safely invoke a dynamically-named store method */
    const invoke = (methodName: string) => {
      const store = getStore();
      const fn = (store as Record<string, unknown>)[methodName];
      if (typeof fn === 'function') (fn as () => void)();
    };

    const createHandlerMap = (suffix: string = '') => ({
      alignLeft: () => invoke(`alignLeft${suffix}`),
      alignCenter: () => invoke(`alignCenter${suffix}`),
      alignRight: () => invoke(`alignRight${suffix}`),
      alignTop: () => invoke(`alignTop${suffix}`),
      alignMiddle: () => invoke(`alignMiddle${suffix}`),
      alignBottom: () => invoke(`alignBottom${suffix}`),
      distributeHorizontally: () => invoke(`distributeHorizontally${suffix}`),
      distributeVertically: () => invoke(`distributeVertically${suffix}`),
      matchWidthToLargest: () => invoke(`matchWidthToLargest${suffix}`),
      matchHeightToLargest: () => invoke(`matchHeightToLargest${suffix}`),
      matchWidthToSmallest: () => invoke(`matchWidthToSmallest${suffix}`),
      matchHeightToSmallest: () => invoke(`matchHeightToSmallest${suffix}`),
    });

    const createOrderHandlerMap = (suffix: string = '') => ({
      bringToFront: () => invoke(`bring${suffix}ToFront`),
      sendForward: () => invoke(`send${suffix}Forward`),
      sendBackward: () => invoke(`send${suffix}Backward`),
      sendToBack: () => invoke(`send${suffix}ToBack`),
    });

    // Handler maps for different modes
    // Get arrange config from plugin or use default
    const plugin = activePlugin ? pluginManager.getPlugin(activePlugin) : null;
    const arrangeConfig = plugin?.arrangeConfig ?? DEFAULT_ARRANGE_CONFIGS[activePlugin ?? 'select'] ?? DEFAULT_ARRANGE_CONFIGS.select;
    
    const { suffix, includeOrder, orderSuffix } = arrangeConfig;
    
    const alignHandlers = createHandlerMap(suffix);
    const orderHandlers = includeOrder 
      ? createOrderHandlerMap(orderSuffix ?? suffix) 
      : {
          bringToFront: () => {},
          sendForward: () => {},
          sendBackward: () => {},
          sendToBack: () => {},
        };

    return {
      ...alignHandlers,
      ...orderHandlers,
    };
  }, [activePlugin, getStore]);

  return handlers;
};
