/** Versioned progress storage. Invalid or unavailable browser storage never prevents a run. */
export const SAVE_KEY = 'lighten.manual-ember.v2';

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface EmberAnchor {
  platformId: string;
  x: number;
  y: number;
}

export interface SavedProgress {
  v: 2;
  anchor: EmberAnchor | null;
  readyAtMs?: number;
}

/** Validate data from disk before gameplay trusts it. Unknown versions start a fresh run. */
export function parseSave(text: string | null): SavedProgress | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null) return null;
    const saved = value as Record<string, unknown>;
    const isId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0;
    if (saved.v !== 2) return null;
    let anchor: EmberAnchor | null = null;
    if (saved.anchor !== null) {
      if (typeof saved.anchor !== 'object' || !saved.anchor) return null;
      const candidate = saved.anchor as Record<string, unknown>;
      if (!isId(candidate.platformId) || typeof candidate.x !== 'number' || !Number.isFinite(candidate.x) ||
        typeof candidate.y !== 'number' || !Number.isFinite(candidate.y)) return null;
      anchor = { platformId: candidate.platformId, x: candidate.x, y: candidate.y };
    }
    if (saved.readyAtMs !== undefined && (typeof saved.readyAtMs !== 'number' || !Number.isFinite(saved.readyAtMs) || saved.readyAtMs < 0)) return null;
    return { v: 2, anchor, ...(saved.readyAtMs === undefined ? {} : { readyAtMs: saved.readyAtMs as number }) };
  } catch {
    return null;
  }
}

export function serializeSave(progress: SavedProgress): string {
  return JSON.stringify(progress);
}

export function loadSave(storage: SaveStorage): SavedProgress | null {
  try {
    return parseSave(storage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

/** False means persistence is unavailable; callers keep their in-memory progress. */
export function writeSave(storage: SaveStorage, progress: SavedProgress): boolean {
  try {
    storage.setItem(SAVE_KEY, serializeSave(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: SaveStorage): boolean {
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Used when no browser storage was injected (tests and embedded games). */
export function createMemorySaveStorage(): SaveStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}
