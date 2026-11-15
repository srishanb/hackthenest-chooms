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

export const SETTINGS_STORAGE_KEY = 'lighten.settings.v1';
/** Readable caption sizes supported by the UI, relative to the base text size. */
export const CAPTION_SCALE_RANGE = { min: 0.75, max: 2 } as const;

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

/** Validate semantic ranges as well as types, preserving valid sibling fields. */
export function validateSettings(candidate: unknown): Settings {
  const settings = mergeWithDefaults(DEFAULT_SETTINGS, candidate);
  const inRange = (value: number, min: number, max: number, fallback: number): number =>
    Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  for (const key of Object.keys(settings.volumes) as Array<keyof Settings['volumes']>) {
    settings.volumes[key] = inRange(settings.volumes[key], 0, 1, DEFAULT_SETTINGS.volumes[key]);
  }
  settings.effectStrength = inRange(settings.effectStrength, 0, 1, DEFAULT_SETTINGS.effectStrength);
  settings.captions.scale = inRange(settings.captions.scale, CAPTION_SCALE_RANGE.min,
    CAPTION_SCALE_RANGE.max, DEFAULT_SETTINGS.captions.scale);
  // KeyboardEvent.code spellings, rather than arbitrary display characters.
  const keyCode = /^(?:Key[A-Z]|Digit[0-9]|Arrow(?:Left|Right|Up|Down)|Space|Escape|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|CapsLock|(?:Shift|Control|Alt|Meta)(?:Left|Right)|F(?:[1-9]|1[0-9]|2[0-4])|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter|Equal))$/;
  for (const key of Object.keys(settings.keys) as Array<keyof Settings['keys']>) {
    if (!keyCode.test(settings.keys[key])) settings.keys[key] = DEFAULT_SETTINGS.keys[key];
  }
  return settings;
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    return validateSettings(raw === null ? null : JSON.parse(raw));
  } catch {
    return validateSettings(null);
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
