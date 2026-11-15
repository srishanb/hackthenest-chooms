/** Versioned progress storage. Invalid or unavailable browser storage never prevents a run. */
export const SAVE_KEY = 'lighten.save.v1';

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SavedProgress {
  v: 1;
  refugeId: string | null;
  emberAvailable: boolean;
  visitedRefugeIds: string[];
}

/** Validate data from disk before gameplay trusts it. Unknown versions start a fresh run. */
export function parseSave(text: string | null): SavedProgress | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null) return null;
    const saved = value as Record<string, unknown>;
    const isId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0;
    if (saved.v !== 1 || typeof saved.emberAvailable !== 'boolean') return null;
    if (saved.refugeId !== null && !isId(saved.refugeId)) return null;
    if (!Array.isArray(saved.visitedRefugeIds) || !saved.visitedRefugeIds.every(isId)) return null;
    const visited = [...new Set(saved.visitedRefugeIds as string[])];
    if (saved.refugeId !== null && !visited.includes(saved.refugeId as string)) return null;
    return { v: 1, refugeId: saved.refugeId as string | null, emberAvailable: saved.emberAvailable, visitedRefugeIds: visited };
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
