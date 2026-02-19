import type { CanvasElement } from '../types';
import type { CanvasStore } from './canvasStore';
import { logger } from '../utils/logger';

type CleanupHook = (
  deletedElementIds: string[],
  remainingElements: CanvasElement[],
  state: CanvasStore
) => Partial<CanvasStore> | void;

const cleanupHooks = new Map<string, CleanupHook>();
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      logger.warn('Cleanup hook listener failed', error);
    }
  });
};

export function registerCleanupHook(pluginId: string, hook: CleanupHook): void {
  cleanupHooks.set(pluginId, hook);
  notifyListeners();
}

export function unregisterCleanupHook(pluginId: string): void {
  if (cleanupHooks.delete(pluginId)) {
    notifyListeners();
  }
}

export function runCleanupHooks(
  deletedElementIds: string[],
  remainingElements: CanvasElement[],
  state: CanvasStore
): Partial<CanvasStore> {
  const aggregated: Partial<CanvasStore> = {};

  cleanupHooks.forEach((hook, pluginId) => {
    try {
      const result = hook(deletedElementIds, remainingElements, state);
      if (result && typeof result === 'object') {
        Object.assign(aggregated, result);
      }
    } catch (error) {
      logger.warn(`Cleanup hook for ${pluginId} failed`, error);
    }
  });

  return aggregated;
}
