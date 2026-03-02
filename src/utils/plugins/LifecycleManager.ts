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
  private actions = new Map<string, {
    handlers: Set<() => void>;
    globalTransition: boolean;
  }>();

  /**
   * Register a lifecycle action handler.
   *
   * @param id - Unique identifier for the action (e.g., 'onModeEnter:edit')
   * @param handler - Function to execute when the action is triggered
   * @returns Unregister function
   */
  register(id: string, handler: () => void, options?: { global?: boolean }): () => void {
    const entry = this.actions.get(id) ?? {
      handlers: new Set<() => void>(),
      globalTransition: false,
    };

    entry.handlers.add(handler);
    entry.globalTransition = entry.globalTransition || options?.global === true;
    this.actions.set(id, entry);

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
    const entry = this.actions.get(id);
    if (entry) {
      entry.handlers.delete(handler);
      if (entry.handlers.size === 0) {
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
    const entry = this.actions.get(id);
    if (!entry) return 0;

    let count = 0;
    for (const handler of entry.handlers) {
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
   * Get all global transition actions.
   */
  getGlobalTransitionActions(): string[] {
    return [...this.actions.entries()]
      .filter(([, entry]) => entry.globalTransition)
      .map(([actionId]) => actionId);
  }

  /**
   * Clear all lifecycle actions.
   * Used primarily for cleanup/testing.
   */
  clear(): void {
    this.actions.clear();
  }

}

/**
 * Factory function to create a LifecycleManager.
 */
export function createLifecycleManager(): LifecycleManager {
  return new LifecycleManager();
}
