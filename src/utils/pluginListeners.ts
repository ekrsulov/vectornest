import type { PluginContextFull } from '../types/plugins';
import type { PluginContextStoreLike } from './pluginContextBuilder';
import { buildPluginContext } from './pluginContextBuilder';
import { logger } from './logger';

export type ListenerSpec<E extends Event = Event> = {
  // Target can be an EventTarget or a function returning an EventTarget (useful for svg lookup)
  target?: EventTarget | (() => EventTarget | null);
  event: string;
  handler: (e: E) => void;
  options?: AddEventListenerOptions | boolean;
};

/**
 * Creates a PluginContextFull from a Zustand store hook.
 * This helper eliminates the need for verbose `as unknown as` casts when using 
 * installGlobalPluginListeners outside of plugin context.
 * 
 * @param storeHook - Zustand store hook (useCanvasStore)
 * @returns PluginContextFull compatible object
 */
export function createListenerContext<TStore extends object>(
  storeHook: PluginContextStoreLike<TStore>
): PluginContextFull<TStore> {
  return buildPluginContext({ store: storeHook });
}

/**
 * Install event listeners and optionally subscribe to store to auto-cleanup.
 * Returns a cleanup function which removes listeners and unsubscribes.
 */
export function installGlobalPluginListeners<TStore extends object = object, E extends Event = Event>(
  context: PluginContextFull<TStore>,
  listeners: ListenerSpec<E>[],
  shouldUnmount?: (state: TStore) => boolean
) {
  // Add listeners
  const added: Array<{ target: EventTarget; spec: ListenerSpec<E> }> = [];

  listeners.forEach((spec) => {
    try {
      const realTarget = typeof spec.target === 'function' ? spec.target() : (spec.target ?? window);
      if (!realTarget) return;
      realTarget.addEventListener(spec.event, spec.handler as EventListener, spec.options);
      added.push({ target: realTarget, spec });
    } catch (err) {
      // Ignore addEventListener errors in environments where window isn't available (SSR)
      // But keep code robust to errors.
      logger.error('installGlobalPluginListeners addEventListener error', err);
    }
  });

  let unsub: (() => void) | null = null;
  if (typeof shouldUnmount === 'function') {
    try {
      let cleanedUp = false;
      let sub: (() => void) | null = null;
      sub = context.store.subscribe((s) => {
        try {
          if (shouldUnmount(s as TStore)) {
            // perform cleanup once
            if (cleanedUp) return;
            // remove all listeners
            added.forEach(({ target, spec }) => {
              try {
                target.removeEventListener(spec.event, spec.handler as EventListener, spec.options);
              } catch (err) {
                logger.error('installGlobalPluginListeners removeEventListener error', err);
              }
            });
            // Stop subscription asynchronously. We avoid calling `sub()` synchronously while
            // still initializing the subscription as some store implementations call the
            // callback synchronously during `subscribe`. Scheduling it via microtask ensures
            // the subscription function is initialized first.
            Promise.resolve().then(() => {
              if (sub) sub();
            });
            cleanedUp = true;
          }
        } catch (err) {
          logger.error('installGlobalPluginListeners shouldUnmount error', err);
        }
      });
      // store returns an unsubscribe function
      unsub = sub;
    } catch (err) {
      logger.error('installGlobalPluginListeners subscribe error', err);
    }
  }

  const cleanup = () => {
    added.forEach(({ target, spec }) => {
      try {
        target.removeEventListener(spec.event, spec.handler as EventListener, spec.options);
      } catch (err) {
        logger.error('installGlobalPluginListeners cleanup error', err);
      }
    });
    if (unsub) {
      try {
        unsub();
      } catch (err) {
        logger.error('installGlobalPluginListeners unsub error', err);
      }
      unsub = null;
    }
  };

  return cleanup;
}
