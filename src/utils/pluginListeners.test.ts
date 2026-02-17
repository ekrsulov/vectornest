import { describe, it, expect, vi } from 'vitest';
import { installGlobalPluginListeners } from './pluginListeners';
import type { PluginContextFull } from '../types/plugins';

describe('installGlobalPluginListeners', () => {
  it('adds and removes listeners and unsubscribes on shouldUnmount', async () => {
    const mockTarget = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as EventTarget;

    // subscriber callback will be invoked by mock subscribe; no need to store it
    let unsubCalled = false;

    const mockContext: unknown = {
      store: {
        subscribe: (cb: (s: { shouldUnmount?: boolean }, prev: { shouldUnmount?: boolean } | null) => void) => {
          // simulate an immediate state update that triggers unmount
          cb({ shouldUnmount: true }, null);
          return () => {
            unsubCalled = true;
          };
        },
      },
    };

    const handler = () => {};

    const cleanup = installGlobalPluginListeners(mockContext as PluginContextFull<{ shouldUnmount?: boolean }>, [
      { target: mockTarget, event: 'pointermove', handler },
    ], (state) => state.shouldUnmount === true);

    expect(mockTarget.addEventListener).toHaveBeenCalledTimes(1);
    expect(mockTarget.addEventListener).toHaveBeenCalledWith('pointermove', handler, undefined);

    // subscribe callback invoked immediately during install so we can assert

    // Wait for microtask that triggers unsubscribe
    await Promise.resolve();
    expect(mockTarget.removeEventListener).toHaveBeenCalledTimes(1);
    expect(unsubCalled).toBe(true);

    // Calling cleanup after should not throw and will be idempotent
    cleanup();
  });
});
