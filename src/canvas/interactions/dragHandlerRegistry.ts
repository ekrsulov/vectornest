import type { DragContext, DragHandler } from '../../types/extensionPoints';
import type { CanvasStore } from '../../store/canvasStore';
import { logger } from '../../utils/logger';

const handlers: DragHandler[] = [];
let sortedHandlersCache: DragHandler[] | null = null;

const getSortedHandlers = (): DragHandler[] => {
  if (!sortedHandlersCache) {
    sortedHandlersCache = [...handlers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  return sortedHandlersCache;
};

export const registerDragHandler = (handler: DragHandler): void => {
  const existingIndex = handlers.findIndex((h) => h.pluginId === handler.pluginId && h.type === handler.type);
  if (existingIndex >= 0) {
    handlers[existingIndex] = handler;
  } else {
    handlers.push(handler);
  }
  sortedHandlersCache = null;
};

export const unregisterDragHandler = (pluginId: string): void => {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    if (handlers[i].pluginId === pluginId) {
      handlers.splice(i, 1);
    }
  }
  sortedHandlersCache = null;
};

export const getActiveDragContext = (state: CanvasStore): DragContext | null => {
  const sorted = getSortedHandlers();
  for (const handler of sorted) {
    try {
      if (handler.canHandle(state)) {
        const context = handler.getContext(state);
        if (context) {
          const { pluginId: _ignoredPluginId, type: contextType, ...rest } = context;
          return {
            pluginId: handler.pluginId,
            type: handler.type ?? contextType,
            ...rest,
          };
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.warn(`[dragHandlerRegistry] Error in handler "${handler.pluginId}":`, error);
      }
    }
  }
  return null;
};
