/**
 * A tiny observable store: one value, read it, replace it, get told when it changes.
 *
 * Why: the game writes its state here and the UI and audio read it, so gameplay never
 * calls into the UI. It is deliberately not a framework; about twenty lines is all we need.
 */

export interface Store<T> {
  get(): T;
  /** Replace the value and notify subscribers. Setting the identical value does nothing. */
  set(next: T): void;
  /** Called after every change. Returns an unsubscribe function. */
  subscribe(listener: (value: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();

  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error('[store] subscriber threw', error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
