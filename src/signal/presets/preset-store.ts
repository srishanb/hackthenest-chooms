/**
 * Where saved presets live: IndexedDB, with an in-memory fallback.
 *
 * Why IndexedDB and not localStorage: a preset is up to about a megabyte and localStorage holds about
 * 5 MB for the whole site. Every access is wrapped: in a private window or with storage blocked the
 * store falls back to memory, so Save still works for the session and nothing throws into the game.
 */
import type { SavedPreset } from './preset-types';

export interface PresetStore {
  list(): Promise<SavedPreset[]>;
  get(id: string): Promise<SavedPreset | null>;
  put(preset: SavedPreset): Promise<void>;
  delete(id: string): Promise<void>;
}

export function createMemoryPresetStore(): PresetStore {
  const items = new Map<string, SavedPreset>();
  return {
    list: async () => [...items.values()],
    get: async (id) => items.get(id) ?? null,
    put: async (preset) => void items.set(preset.id, preset),
    delete: async (id) => void items.delete(id),
  };
}

const DB_NAME = 'lighten-up-presets';
const STORE = 'presets';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'));
  });
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => void request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
    request.onblocked = () => reject(new Error('indexedDB open blocked'));
  });
}

/** IndexedDB-backed store. Any failure (blocked, quota, no IndexedDB) switches to memory for the rest of the session. */
export function createPresetStore(factory: IDBFactory | undefined = globalThis.indexedDB): PresetStore {
  const memory = createMemoryPresetStore();
  let db: Promise<IDBDatabase> | null = null;
  let broken = factory === undefined;

  async function run<R, T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<R>, convert: (result: R) => T, fallback: () => Promise<T>): Promise<T> {
    if (broken || factory === undefined) return fallback();
    try {
      db ??= openDb(factory);
      const store = (await db).transaction(STORE, mode).objectStore(STORE);
      return convert(await requestToPromise(action(store)));
    } catch (error) {
      console.warn('[signal] saved presets fall back to memory', error);
      broken = true;
      return fallback();
    }
  }

  return {
    list: () => run('readonly', (s) => s.getAll() as IDBRequest<SavedPreset[]>, (r) => r, () => memory.list()),
    get: (id) => run('readonly', (s) => s.get(id) as IDBRequest<SavedPreset | undefined>, (r) => r ?? null, () => memory.get(id)),
    put: (preset) => run('readwrite', (s) => s.put(preset), () => undefined, () => memory.put(preset)),
    delete: (id) => run('readwrite', (s) => s.delete(id), () => undefined, () => memory.delete(id)),
  };
}
