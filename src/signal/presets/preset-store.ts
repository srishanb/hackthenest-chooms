/**
 * Saved presets in browser storage.
 *
 * Why: a recording from the board (or the simulator) should survive a reload and be replayable from
 * Settings. localStorage is small (about 5 MB), so the store keeps only a few presets and reports a
 * readable error when the browser refuses a write. Every storage call is wrapped: blocked storage
 * must never break the game.
 */
import type { KeyValueStorage } from '../../shared/safe-storage';

export const PRESET_STORAGE_KEY = 'lighten.presets.v1';
export const MAX_SAVED_PRESETS = 4;

export interface SavedPreset {
  id: string;
  label: string;
  createdAt: string;
  durationMs: number;
  jsonl: string;
}

export interface PresetStore {
  list(): SavedPreset[];
  get(id: string): SavedPreset | null;
  /** Throws a readable error when the limit is reached or storage refuses the write. */
  add(label: string, jsonl: string, durationMs: number): SavedPreset;
  remove(id: string): void;
}

const isSaved = (value: unknown): value is SavedPreset =>
  typeof value === 'object' && value !== null &&
  typeof (value as SavedPreset).id === 'string' && typeof (value as SavedPreset).label === 'string' &&
  typeof (value as SavedPreset).jsonl === 'string' && typeof (value as SavedPreset).durationMs === 'number' &&
  typeof (value as SavedPreset).createdAt === 'string';

/** A label safe to show: trimmed, no control characters, at most 40 characters, never empty. */
export function cleanLabel(label: string): string {
  const cleaned = label.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 40);
  if (cleaned === '') throw new Error('Give the preset a name.');
  return cleaned;
}

export function createPresetStore(storage: KeyValueStorage | undefined, now: () => number = () => Date.now()): PresetStore {
  function read(): SavedPreset[] {
    try {
      const raw = storage?.getItem(PRESET_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
    } catch {
      return [];
    }
  }
  function write(items: SavedPreset[]): void {
    if (!storage) throw new Error('This browser is not allowing storage, so presets cannot be saved. Export the file instead.');
    try {
      storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(items));
    } catch {
      throw new Error('The browser has no room to store this preset. Delete a saved preset or export the file instead.');
    }
  }
  return {
    list: read,
    get: (id) => read().find((item) => item.id === id) ?? null,
    add(label, jsonl, durationMs) {
      const items = read();
      if (items.length >= MAX_SAVED_PRESETS) throw new Error(`You can keep ${MAX_SAVED_PRESETS} saved presets. Delete one first.`);
      const stamp = now();
      let id = `saved-${stamp.toString(36)}`;
      while (items.some((item) => item.id === id)) id += 'x';
      const saved: SavedPreset = { id, label: cleanLabel(label), createdAt: new Date(stamp).toISOString(), durationMs, jsonl };
      write([...items, saved]);
      return saved;
    },
    remove(id) {
      write(read().filter((item) => item.id !== id));
    },
  };
}
