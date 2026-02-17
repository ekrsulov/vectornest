import { logger } from '../logger';

/**
 * LifecycleManager handles plugin lifecycle actions.
 *
 * Lifecycle actions are callbacks that execute at specific points:
 * - Mode entry/exit: When a canvas mode becomes active or inactive
 * - Selection changes: When element selection changes
 * - Before/after operations: Hooks around specific operations
 *
 * @example
 * ```ts
 * const lifecycleManager = new LifecycleManager();
 * lifecycleManager.register('onModeEnter:edit', () => console.log('Edit mode entered'));
 * lifecycleManager.execute('onModeEnter:edit');
 * ```
 */
export class LifecycleManager {
  private actions = new Map<string, Set<() => void>>();
  private globalTransitionActions: string[] = [];

  /**
   * Register a lifecycle action handler.
   *
   * @param id - Unique identifier for the action (e.g., 'onModeEnter:edit')
   * @param handler - Function to execute when the action is triggered
   * @returns Unregister function
   */
  register(id: string, handler: () => void): () => void {
    if (!this.actions.has(id)) {
      this.actions.set(id, new Set());
    }
    this.actions.get(id)!.add(handler);

    // Return cleanup function
    return () => this.unregister(id, handler);
  }

  /**
   * Unregister a specific handler from a lifecycle action.
   *
   * @param id - Action identifier
   * @param handler - Handler function to remove
   */
  unregister(id: string, handler: () => void): void {
    const handlers = this.actions.get(id);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.actions.delete(id);
      }
    }
  }

  /**
   * Execute all handlers registered for a lifecycle action.
   *
   * @param id - Action identifier
   * @returns Number of handlers executed
   */
  execute(id: string): number {
    const handlers = this.actions.get(id);
    if (!handlers) return 0;

    let count = 0;
    for (const handler of handlers) {
      try {
        handler();
        count++;
      } catch (error) {
        logger.error(`[LifecycleManager] Error executing action "${id}":`, error);
      }
    }

    return count;
  }

  /**
   * Register a global transition action.
   * These actions run on every mode transition.
   */
  registerGlobalTransitionAction(action: string): void {
    if (!this.globalTransitionActions.includes(action)) {
      this.globalTransitionActions.push(action);
    }
  }

  /**
   * Get all global transition actions.
   */
  getGlobalTransitionActions(): string[] {
    return [...this.globalTransitionActions];
  }

  /**
   * Clear all lifecycle actions.
   * Used primarily for cleanup/testing.
   */
  clear(): void {
    this.actions.clear();
    this.globalTransitionActions = [];
  }

}

/**
 * Factory function to create a LifecycleManager.
 */
export function createLifecycleManager(): LifecycleManager {
  return new LifecycleManager();
}
