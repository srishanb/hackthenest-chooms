/**
 * Height score for one endless run, and the best height kept on this device.
 *
 * Height counts only when the candle is standing on a ledge, so a jump that falls back does not
 * score. The best is a personal record in local storage: no ranking and no comparison with anyone
 * (AGENTS.md, binding rule 7). Storage that throws or holds junk is ignored and play continues.
 */
import type { RunSnapshot } from '../../shared/contracts/game-state';
import type { KeyValueStorage } from '../../shared/safe-storage';

export interface RunScore {
  /** Call when the candle stands on a ledge with its feet at `feetY`. Returns true if the height grew. */
  stand(feetY: number): boolean;
  snapshot(): RunSnapshot;
  /** Write the best height to storage (called when a run ends and on landings that beat it). */
  save(): void;
  /** Start a new run from the same origin; the best is kept. */
  reset(seed: number): void;
}

/** How many seeded climbs keep a best height; older ones are forgotten so storage never grows without end. */
export const SEEDED_BESTS_KEPT = 30;

/**
 * Remember that `key` holds a seeded climb's best, and forget the oldest ones past the limit.
 * Storage offers no way to list its keys, so the keys in use are kept in one small list at `indexKey`.
 */
export function rememberSeededBest(storage: KeyValueStorage, indexKey: string, key: string, kept = SEEDED_BESTS_KEPT): void {
  try {
    // A list that cannot be read is started again rather than trusted.
    let parsed: unknown = [];
    try { parsed = JSON.parse(storage.getItem(indexKey) ?? '[]'); } catch { parsed = []; }
    const known = Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
    const next = [...known.filter((entry) => entry !== key), key];
    for (const old of next.splice(0, Math.max(0, next.length - kept))) storage.removeItem(old);
    storage.setItem(indexKey, JSON.stringify(next));
  } catch { /* Blocked or full storage: nothing is pruned, and play continues. */ }
}

export function createRunScore(options: { seed: number; originFeetY: number; storage?: KeyValueStorage; key: string; persist?: boolean;
  /** Set for a seeded climb's own best: the key of the list of such keys, so old ones can be pruned. */
  indexKey?: string }): RunScore {
  const { originFeetY, storage, key, persist = true } = options;
  let seed = options.seed;
  let heightPx = 0;
  let bestPx = 0;
  let bestAtStart = 0;
  try {
    const saved = Number(storage?.getItem(key));
    if (Number.isFinite(saved) && saved > 0) bestPx = saved;
  } catch { /* Blocked storage: the best lasts for this session only. */ }
  bestAtStart = bestPx;
  return {
    stand(feetY) {
      const height = originFeetY - feetY;
      if (!Number.isFinite(height) || height <= heightPx) return false;
      heightPx = height;
      bestPx = Math.max(bestPx, heightPx);
      return true;
    },
    snapshot: () => ({ mode: 'endless', seed, heightPx: Math.round(heightPx), bestPx: Math.round(bestPx),
      newBest: bestAtStart > 0 && heightPx > bestAtStart }),
    save() {
      if (!persist) return;
      try { storage?.setItem(key, String(Math.round(bestPx))); } catch { /* Session-only best. */ }
      if (storage && options.indexKey) rememberSeededBest(storage, options.indexKey, key);
    },
    reset(nextSeed) { seed = nextSeed; heightPx = 0; bestAtStart = bestPx; },
  };
}
