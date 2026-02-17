import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('executes only the latest call after the delay', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced('first');
    vi.advanceTimersByTime(50);
    debounced('second');
    vi.advanceTimersByTime(99);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('cancel prevents pending execution', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced('value');
    debounced.cancel();
    vi.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  it('flush runs pending execution immediately and clears the timer', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced('value');
    vi.advanceTimersByTime(40);
    debounced.flush();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('value');

    vi.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
