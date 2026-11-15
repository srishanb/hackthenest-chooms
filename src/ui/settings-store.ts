/**
 * Loads, validates and saves player settings.
 *
 * Why validate: localStorage can hold anything (an old version, a hand-edited value, junk).
 * Anything that does not match the shape of the defaults is replaced by the default, so a
 * bad saved value can never break the game. Changes apply live through the store and are
 * saved on every change.
 */
import { DEFAULT_SETTINGS, type Settings } from '../shared/contracts/settings';
import { createStore, type Store } from '../shared/store';

export const SETTINGS_STORAGE_KEY = 'lighten-up.settings.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keep each field of `candidate` only if it has the same type as the default; otherwise use the default. */
export function mergeWithDefaults<T>(defaults: T, candidate: unknown): T {
  if (isPlainObject(defaults)) {
    const source = isPlainObject(candidate) ? candidate : {};
    const merged: Record<string, unknown> = {};
    for (const [key, defaultValue] of Object.entries(defaults)) merged[key] = mergeWithDefaults(defaultValue, source[key]);
    return merged as T;
  }
  if (typeof candidate !== typeof defaults) return defaults;
  if (typeof candidate === 'number' && !Number.isFinite(candidate)) return defaults;
  return candidate as T;
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    return mergeWithDefaults(DEFAULT_SETTINGS, raw === null ? null : JSON.parse(raw));
  } catch {
    return mergeWithDefaults(DEFAULT_SETTINGS, null);
  }
}

/** A settings store that starts from saved values and saves every change. */
export function createSettingsStore(storage: StorageLike): Store<Settings> {
  const store = createStore(loadSettings(storage));
  store.subscribe((settings) => {
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage full or blocked (private window): settings still apply for this session.
    }
  });
  return store;
}
