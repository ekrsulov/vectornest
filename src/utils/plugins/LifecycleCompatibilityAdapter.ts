import type { LifecycleManager } from './LifecycleManager';

export interface LifecycleCompatibilityAdapter {
  registerLifecycleAction(
    actionId: string,
    handler: () => void,
    options?: { global?: boolean }
  ): () => void;
  executeLifecycleAction(actionId: string): void;
  getGlobalTransitionActions(): string[];
}

/**
 * Adapter that preserves legacy lifecycle behavior while delegating to LifecycleManager.
 */
export function createLifecycleCompatibilityAdapter(
  lifecycleManager: LifecycleManager
): LifecycleCompatibilityAdapter {
  return {
    registerLifecycleAction(
      actionId: string,
      handler: () => void,
      options?: { global?: boolean }
    ): () => void {
      const unregister = lifecycleManager.register(actionId, handler);

      if (options?.global) {
        lifecycleManager.registerGlobalTransitionAction(actionId);
      }

      return unregister;
    },

    executeLifecycleAction(actionId: string): void {
      lifecycleManager.execute(actionId);
    },

    getGlobalTransitionActions(): string[] {
      return lifecycleManager.getGlobalTransitionActions();
    },
  };
}
