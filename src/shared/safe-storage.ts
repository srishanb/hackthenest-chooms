/**
 * Reading `window.localStorage` safely at boot.
 *
 * Why: in a browser with storage blocked (some private modes, strict cookie settings) even
 * reading the `localStorage` property throws a SecurityError. Booting must survive that, so the
 * composition root asks here and falls back to memory when storage is unavailable.
 */

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `scope.localStorage`, or undefined when reading it throws or it is missing. */
export function getLocalStorage(scope: { readonly localStorage?: Storage }): Storage | undefined {
  try {
    return scope.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** A throwaway in-memory storage for when the browser's is blocked. Nothing survives a reload. */
export function createMemoryStorage(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
  };
}
