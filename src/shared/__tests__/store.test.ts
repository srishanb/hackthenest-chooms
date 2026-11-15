import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../store';

describe('store', () => {
  it('returns the initial value, then the latest set value', () => {
    const store = createStore({ n: 1 });
    expect(store.get()).toEqual({ n: 1 });
    store.set({ n: 2 });
    expect(store.get()).toEqual({ n: 2 });
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const store = createStore(0);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set(1);
    off();
    store.set(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('does not notify when the identical value is set', () => {
    const store = createStore(5);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(5);
    expect(listener).not.toHaveBeenCalled();
  });
});
